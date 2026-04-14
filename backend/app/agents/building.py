from __future__ import annotations
from typing import Any
from app.agents.base import build_agent, run_agent
from app.tools.yelp import search_yelp
from app.tools.search import web_search

SYSTEM_PROMPT = """You are the Building & Landlord Agent for a rental property evaluator.

Evaluate the specific unit, building, and landlord reputation.

Research ALL of the following:
1. Landlord name / management company — search for court filings, eviction history, complaints
2. Building code violation history (search public records)
3. Pest complaint records (search public health data, Yelp reviews)
4. Building age and known infrastructure concerns
5. Noise sources near the address:
   - Airport flight paths
   - Highway or freeway proximity
   - Train/metro tracks nearby
   - Bars and nightclubs within 0.2 miles
   - Active construction zones
6. Cell signal and internet infrastructure in the building (if findable)

Flag any red flags clearly. Red flags include: eviction history, code violations, pest infestations,
major noise sources, or unresolved complaints.
"""


async def run_building_agent(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    agent = build_agent(
        system_prompt=SYSTEM_PROMPT,
        tools=[search_yelp, web_search],
        api_key=api_key,
    )
    user_msg = (
        f"Evaluate building and landlord for: {address} (zip: {zip_code})\n"
        f"User profile: {profile}"
    )
    return await run_agent(agent, user_msg)
