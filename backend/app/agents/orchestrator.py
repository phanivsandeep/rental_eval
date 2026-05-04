"""
LangGraph StateGraph orchestrator.

Flow:  START → gather_agents → consistency_check → synthesize → END

gather_agents   : runs all 8 sub-agents in parallel (asyncio.gather),
                  posts SSE events to a side-channel queue as each completes.
consistency_check: single LLM call — reviews scores for contradictions vs user priorities.
synthesize       : weighted match score + persona narrative.
"""
from __future__ import annotations
import asyncio
import json
import logging
import re
from typing import Any, AsyncGenerator, TypedDict

from langchain_anthropic import ChatAnthropic
from langgraph.graph import StateGraph, START, END

from app.agents.safety import run_safety_agent
from app.agents.transportation import run_transportation_agent
from app.agents.food import run_food_agent
from app.agents.lifestyle import run_lifestyle_agent
from app.agents.convenience import run_convenience_agent
from app.agents.utilities import run_utilities_agent
from app.agents.building import run_building_agent
from app.agents.future_risk import run_future_risk_agent

logger = logging.getLogger(__name__)

AGENT_TIMEOUT = 45

DIMENSION_ORDER = [
    "safety", "transportation", "food", "lifestyle",
    "convenience", "utilities", "building", "future_risk",
]


# ── State ──────────────────────────────────────────────────────────────────────

class EvaluationState(TypedDict):
    address: str
    zip_code: str
    profile: dict[str, Any]
    api_key: str
    evaluation_id: str
    sections: dict[str, dict[str, Any]]
    consistency_notes: list[str]
    report: dict[str, Any]


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _run_with_timeout(name: str, coro, timeout: int = AGENT_TIMEOUT) -> dict[str, Any]:
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning("Agent '%s' timed out after %ds", name, timeout)
        return {"match_score": 50, "summary": "Timed out — data unavailable", "details": ""}
    except Exception as e:
        logger.exception("Agent '%s' failed: %s", name, e)
        return {"match_score": 50, "summary": f"Error: {e}", "details": ""}


# ── Nodes ──────────────────────────────────────────────────────────────────────

def _make_gather_node(sse_queue: asyncio.Queue):
    """Closes over the SSE queue so individual agent completions stream in real time."""

    async def gather_agents(state: EvaluationState) -> dict:
        address  = state["address"]
        zip_code = state["zip_code"]
        profile  = state["profile"]
        api_key  = state["api_key"]

        sections: dict[str, dict[str, Any]] = {}

        async def run_one(name: str, coro):
            await sse_queue.put(("agent_update", {"agent": name, "status": "running"}))
            result = await _run_with_timeout(name, coro)
            sections[name] = result
            await sse_queue.put(("agent_update", {
                "agent": name,
                "status": "complete",
                "match_score": result.get("match_score", 50),
                "summary": result.get("summary", ""),
            }))

        await asyncio.gather(
            run_one("safety",         run_safety_agent(address, zip_code, profile, api_key)),
            run_one("transportation", run_transportation_agent(address, zip_code, profile, api_key)),
            run_one("food",           run_food_agent(address, zip_code, profile, api_key)),
            run_one("lifestyle",      run_lifestyle_agent(address, zip_code, profile, api_key)),
            run_one("convenience",    run_convenience_agent(address, zip_code, profile, api_key)),
            run_one("utilities",      run_utilities_agent(address, zip_code, profile, api_key)),
            run_one("building",       run_building_agent(address, zip_code, profile, api_key)),
            run_one("future_risk",    run_future_risk_agent(address, zip_code, profile, api_key)),
            return_exceptions=True,
        )

        return {"sections": sections}

    return gather_agents


async def _consistency_check(state: EvaluationState) -> dict:
    """
    Single LLM call (no tools). Checks for contradictions between scores
    and the user's declared priorities. Returns plain-language notes.
    """
    sections = state["sections"]
    profile  = state["profile"]
    api_key  = state["api_key"]

    priorities: list[str] = profile.get("priorities", DIMENSION_ORDER)
    scores_summary = "\n".join(
        f"  {dim}: {sections.get(dim, {}).get('match_score', '?')}/100"
        for dim in DIMENSION_ORDER
    )

    prompt = f"""You are reviewing 8 match scores for a rental property evaluation.
The user's top priority is: {priorities[0] if priorities else 'safety'}
Full priority order (most → least important): {priorities}

Scores:
{scores_summary}

Identify any of the following (return empty list [] if none):
1. Top-priority dimension scored below 50 — critical mismatch, flag clearly
2. Two adjacent-priority dimensions with contradictory scores (e.g. safety=85 but future_risk=18)
3. A score that is implausibly high or low given all the others

Return ONLY a JSON array of brief plain-language notes (max 3). No other text.
Example: ["Safety is your top priority but scored 38 — this location has notable concerns.",
          "Future risk score of 22 contradicts the otherwise high scores."]
If no issues: []"""

    llm = ChatAnthropic(model="claude-sonnet-4-6", api_key=api_key, max_tokens=512)
    try:
        result  = await llm.ainvoke(prompt)
        content = result.content if hasattr(result, "content") else str(result)
        match   = re.search(r'\[.*\]', content, re.DOTALL)
        notes   = json.loads(match.group()) if match else []
    except Exception as e:
        logger.warning("Consistency check failed: %s", e)
        notes = []

    return {"consistency_notes": notes}


async def _synthesize(state: EvaluationState) -> dict:
    sections          = state["sections"]
    profile           = state["profile"]
    api_key           = state["api_key"]
    address           = state["address"]
    consistency_notes = state.get("consistency_notes", [])

    # Weighted match score — higher-priority dimensions count more
    priorities = profile.get("priorities", DIMENSION_ORDER)
    n = len(DIMENSION_ORDER)
    weights = {dim: (n - i) for i, dim in enumerate(priorities)}
    total_weight = sum(weights.values())

    overall_match_score = round(
        sum(
            sections.get(dim, {}).get("match_score", 50) * weights.get(dim, 1)
            for dim in DIMENSION_ORDER
        ) / total_weight
    )

    # Monthly cost estimate (embedded in utilities agent's details JSON)
    monthly_cost: dict[str, Any] = {}
    utilities_details = sections.get("utilities", {}).get("details", "")
    cost_match = re.search(r'"monthly_cost_estimate"\s*:\s*(\{[^}]+\})', utilities_details, re.DOTALL)
    if cost_match:
        try:
            monthly_cost = json.loads(cost_match.group(1))
        except json.JSONDecodeError:
            pass
    if not monthly_cost:
        budget = profile.get("budget", 2000)
        monthly_cost = {
            "rent": budget, "electricity": 90, "gas": 40,
            "internet": 60, "total_estimate": budget + 190,
        }

    # Persona narrative
    narrative = await _generate_narrative(address, profile, sections, overall_match_score, api_key)

    # Pros / cons / red flags
    pros:       list[str] = []
    cons:       list[str] = []
    red_flags:  list[str] = []

    for dim, data in sections.items():
        ms      = data.get("match_score", 50)
        summary = data.get("summary", "")
        if ms >= 75:
            pros.append(summary)
        elif ms < 50:
            cons.append(summary)
        details = data.get("details", "").lower()
        if any(kw in details for kw in ["eviction", "violation", "pest", "mold", "red flag", "warning"]):
            red_flags.append(f"{dim.replace('_', ' ').title()}: {summary}")

    report = {
        "overall_score": overall_match_score,   # key kept for DB compatibility
        "persona_narrative": narrative,
        "pros":              pros[:5],
        "cons":              cons[:5],
        "red_flags":         red_flags[:3],
        "consistency_notes": consistency_notes,
        "monthly_cost_estimate": monthly_cost,
        "sections": {
            dim: {**data, "match_score": data.get("match_score", 50)}
            for dim, data in sections.items()
        },
    }

    return {"report": report}


async def _generate_narrative(
    address: str,
    profile: dict[str, Any],
    sections: dict[str, dict[str, Any]],
    overall_match_score: int,
    api_key: str,
) -> str:
    llm = ChatAnthropic(model="claude-sonnet-4-6", api_key=api_key, max_tokens=1024)

    section_summaries = "\n".join(
        f"- {k.replace('_', ' ').title()} ({v.get('match_score', '?')}/100 match): {v.get('summary', '')}"
        for k, v in sections.items()
    )

    prompt = f"""Write a 2–3 paragraph narrative about how well this rental property matches this specific person.

Address: {address}
Overall Match Score: {overall_match_score}/100

User Profile:
- Background: {profile.get('ethnicity', 'not specified')}
- Household: {profile.get('household', 'solo')}
- Transport: {profile.get('transportation', 'car')}
- Work schedule: {profile.get('work_schedule', '9-5')}
- Exercise: {profile.get('exercise_routine', 'none')}
- Food preferences: {', '.join(profile.get('food_preferences', []))}
- Has pets: {profile.get('has_pets', False)}
- Top priorities: {profile.get('priorities', [])[:3]}

Match Scores:
{section_summaries}

Speak directly to this person. Reference their specific lifestyle and priorities.
Focus on FIT — does this place work for WHO THEY ARE, not whether it is "good" in general.
Be honest about both strengths and gaps. Flowing prose only — no headers or bullet points."""

    result = await llm.ainvoke(prompt)
    return result.content if hasattr(result, "content") else str(result)


# ── Graph builder ──────────────────────────────────────────────────────────────

def _build_graph(sse_queue: asyncio.Queue):
    builder = StateGraph(EvaluationState)

    builder.add_node("gather_agents",     _make_gather_node(sse_queue))
    builder.add_node("consistency_check", _consistency_check)
    builder.add_node("synthesize",        _synthesize)

    builder.add_edge(START,               "gather_agents")
    builder.add_edge("gather_agents",     "consistency_check")
    builder.add_edge("consistency_check", "synthesize")
    builder.add_edge("synthesize",        END)

    return builder.compile()


# ── Public entry point ─────────────────────────────────────────────────────────

async def run_evaluation(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
    evaluation_id: str,
) -> AsyncGenerator[tuple[str, dict], None]:
    """
    Yields (event_type, payload) tuples for SSE streaming.
    Agent updates arrive in real time; the final 'complete' event carries the full report.
    """
    sse_queue: asyncio.Queue[tuple[str, dict]] = asyncio.Queue()
    graph = _build_graph(sse_queue)

    initial_state: EvaluationState = {
        "address":           address,
        "zip_code":          zip_code,
        "profile":           profile,
        "api_key":           api_key,
        "evaluation_id":     evaluation_id,
        "sections":          {},
        "consistency_notes": [],
        "report":            {},
    }

    graph_done = asyncio.Event()
    result_holder: dict[str, Any] = {}

    async def _run():
        try:
            result_holder["state"] = await graph.ainvoke(initial_state)
        except Exception as e:
            logger.exception("Evaluation graph failed: %s", e)
            result_holder["error"] = str(e)
        finally:
            graph_done.set()

    task = asyncio.create_task(_run())

    # Drain SSE queue while graph is running
    while not (graph_done.is_set() and sse_queue.empty()):
        try:
            event_type, payload = await asyncio.wait_for(sse_queue.get(), timeout=0.5)
            yield event_type, payload
        except asyncio.TimeoutError:
            pass

    await task

    if "error" in result_holder:
        yield "error", {"message": result_holder["error"]}
        return

    report = result_holder["state"]["report"]
    yield "complete", {"evaluation_id": evaluation_id, "report": report}
