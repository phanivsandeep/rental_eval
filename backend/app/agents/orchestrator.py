"""
Orchestrator: spawns all 8 subagents in parallel and synthesizes a persona-specific report.
Yields SSE-compatible (event_type, payload) tuples for streaming to the frontend.
"""
from __future__ import annotations
import asyncio
import json
import logging
from typing import Any, AsyncGenerator

from langchain_anthropic import ChatAnthropic

from app.agents.safety import run_safety_agent
from app.agents.transportation import run_transportation_agent
from app.agents.food import run_food_agent
from app.agents.lifestyle import run_lifestyle_agent
from app.agents.convenience import run_convenience_agent
from app.agents.utilities import run_utilities_agent
from app.agents.building import run_building_agent
from app.agents.future_risk import run_future_risk_agent

logger = logging.getLogger(__name__)

AGENT_TIMEOUT = 30  # seconds per subagent

DIMENSION_ORDER = [
    "safety", "transportation", "food", "lifestyle",
    "convenience", "utilities", "building", "future_risk",
]


async def _run_with_timeout(
    name: str,
    coro,
    timeout: int = AGENT_TIMEOUT,
) -> dict[str, Any]:
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning("Agent '%s' timed out after %ds", name, timeout)
        return {"score": 50, "summary": "Timed out — data unavailable", "details": ""}
    except Exception as e:
        logger.exception("Agent '%s' failed: %s", name, e)
        return {"score": 50, "summary": f"Error: {e}", "details": ""}


async def run_evaluation(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
    evaluation_id: str,
) -> AsyncGenerator[tuple[str, dict], None]:
    """
    Yields (event_type, payload) pairs for SSE streaming.
    Runs all subagents concurrently; yields agent_update as each completes.
    """

    sections: dict[str, dict[str, Any]] = {}
    queue: asyncio.Queue[tuple[str, str, dict]] = asyncio.Queue()

    async def run_one(name: str, coro):
        await queue.put(("running", name, {}))
        result = await _run_with_timeout(name, coro)
        sections[name] = result
        await queue.put(("complete", name, result))

    # Build all coroutines
    tasks = asyncio.gather(
        run_one("safety",        run_safety_agent(address, zip_code, profile, api_key)),
        run_one("transportation", run_transportation_agent(address, zip_code, profile, api_key)),
        run_one("food",          run_food_agent(address, zip_code, profile, api_key)),
        run_one("lifestyle",     run_lifestyle_agent(address, zip_code, profile, api_key)),
        run_one("convenience",   run_convenience_agent(address, zip_code, profile, api_key)),
        run_one("utilities",     run_utilities_agent(address, zip_code, profile, api_key)),
        run_one("building",      run_building_agent(address, zip_code, profile, api_key)),
        run_one("future_risk",   run_future_risk_agent(address, zip_code, profile, api_key)),
        return_exceptions=True,
    )

    # Start tasks in background
    task = asyncio.ensure_future(tasks)

    completed = 0
    total = len(DIMENSION_ORDER)

    while completed < total * 2:  # each agent emits 2 events: running + complete
        try:
            event_type, agent_name, data = await asyncio.wait_for(queue.get(), timeout=35)
        except asyncio.TimeoutError:
            break

        if event_type == "running":
            yield "agent_update", {"agent": agent_name, "status": "running"}
        elif event_type == "complete":
            completed += 1
            yield "agent_update", {
                "agent": agent_name,
                "status": "complete",
                "score": data.get("score", 50),
                "summary": data.get("summary", ""),
            }

    await task  # Ensure all tasks finish

    # Synthesize final report
    report = await _synthesize(address, profile, sections, api_key)
    report["sections"] = sections

    yield "complete", {
        "evaluation_id": evaluation_id,
        "report": report,
    }


async def _synthesize(
    address: str,
    profile: dict[str, Any],
    sections: dict[str, dict[str, Any]],
    api_key: str,
) -> dict[str, Any]:
    """Build the final report: weighted overall score + persona narrative."""

    # Weighted score based on user's priority ranking
    priorities: list[str] = profile.get("priorities", DIMENSION_ORDER)
    weights = {dim: (len(DIMENSION_ORDER) - i) for i, dim in enumerate(priorities)}
    total_weight = sum(weights.values())

    overall_score = round(
        sum(
            sections.get(dim, {}).get("score", 50) * weights.get(dim, 1)
            for dim in DIMENSION_ORDER
        ) / total_weight
    )

    # Extract cost estimate from utilities section if present
    import re
    monthly_cost: dict[str, Any] = {}
    utilities_details = sections.get("utilities", {}).get("details", "")
    json_match = re.search(r'"monthly_cost_estimate"\s*:\s*(\{[^}]+\})', utilities_details, re.DOTALL)
    if json_match:
        try:
            monthly_cost = json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    if not monthly_cost:
        budget = profile.get("budget", 2000)
        monthly_cost = {
            "rent": budget,
            "electricity": 90,
            "gas": 40,
            "internet": 60,
            "total_estimate": budget + 190,
        }

    # Generate persona narrative via Claude
    narrative = await _generate_narrative(address, profile, sections, overall_score, api_key)

    # Extract pros/cons/red_flags from section summaries
    pros: list[str] = []
    cons: list[str] = []
    red_flags: list[str] = []

    for dim, data in sections.items():
        score = data.get("score", 50)
        summary = data.get("summary", "")
        if score >= 75:
            pros.append(summary)
        elif score < 50:
            cons.append(summary)
        # Red flags: any section flagging landlord issues, evictions, pests, or high crime
        details = data.get("details", "").lower()
        if any(kw in details for kw in ["eviction", "violation", "pest", "mold", "red flag", "warning"]):
            red_flags.append(f"{dim.replace('_', ' ').title()}: {summary}")

    return {
        "overall_score": overall_score,
        "persona_narrative": narrative,
        "pros": pros[:5],
        "cons": cons[:5],
        "red_flags": red_flags[:3],
        "monthly_cost_estimate": monthly_cost,
    }


async def _generate_narrative(
    address: str,
    profile: dict[str, Any],
    sections: dict[str, dict[str, Any]],
    overall_score: int,
    api_key: str,
) -> str:
    llm = ChatAnthropic(model="claude-sonnet-4-6", api_key=api_key, max_tokens=1024)

    section_summaries = "\n".join(
        f"- {k.replace('_', ' ').title()} ({v.get('score', '?')}/100): {v.get('summary', '')}"
        for k, v in sections.items()
    )

    prompt = f"""Write a 2-3 paragraph persona-specific narrative about this rental property.
Address: {address}
Overall Score: {overall_score}/100

User Profile:
- Background: {profile.get('ethnicity', 'not specified')}
- Household: {profile.get('household', 'solo')}
- Transport: {profile.get('transportation', 'car')}
- Work schedule: {profile.get('work_schedule', '9-5')}
- Exercise: {profile.get('exercise_routine', 'none')}
- Food preferences: {', '.join(profile.get('food_preferences', []))}
- Has pets: {profile.get('has_pets', False)}

Section Scores:
{section_summaries}

Write AS IF talking directly to this specific person. Reference their specific lifestyle (e.g. "for your daily runs...", "as someone commuting by transit...").
Be honest about both strengths and weaknesses. Do NOT use generic language.
Do not include headers or bullet points — flowing prose only."""

    result = await llm.ainvoke(prompt)
    return result.content if hasattr(result, "content") else str(result)
