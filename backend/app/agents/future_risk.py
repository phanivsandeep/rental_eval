from __future__ import annotations
from typing import Any
from app.agents.base import build_agent, run_agent
from app.tools.search import web_search

SYSTEM_PROMPT = """You are the Future Risk Agent for a rental property evaluator.

Assess whether this neighborhood will be a good decision 12–24 months from now.

Research ALL of the following:
1. Neighborhood gentrification trajectory — is rent likely to spike in 12 months?
2. New development or major construction planned nearby
3. Local government fiscal health (affects road quality, public services)
4. School rating trends (affects area desirability even for non-families)
5. Business opening vs closing trend in the area (growing vs declining)
6. Long-term climate risk (sea level rise, heat index trends, wildfire risk trajectory)
7. Upcoming zoning changes that could change the neighborhood character

Provide a forward-looking assessment. Be specific with timelines where possible.
"""


async def run_future_risk_agent(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    agent = build_agent(
        system_prompt=SYSTEM_PROMPT,
        tools=[web_search],
        api_key=api_key,
    )
    user_msg = (
        f"Evaluate future risk for: {address} (zip: {zip_code})\n"
        f"User profile: {profile}"
    )
    return await run_agent(agent, user_msg)
