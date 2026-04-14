from __future__ import annotations
from typing import Any
from app.agents.base import build_agent, run_agent
from app.tools.yelp import search_yelp
from app.tools.google_maps import get_commute_time
from app.tools.search import web_search

SYSTEM_PROMPT = """You are the Convenience & Services Agent for a rental property evaluator.

Evaluate how easily daily errands and emergencies can be handled from this address.

Evaluate ALL applicable items:
1. Pharmacy proximity — flag if no 24-hour option within 1 mile
2. Urgent care proximity
3. ER / hospital distance and drive time (calculate drive time)
4. Specialist clinic density if user has health conditions
5. Vet proximity if user has pets
6. Pet store proximity if user has pets
7. Hardware store and laundromat proximity
8. Bank / ATM proximity
9. Schools and childcare if family household
10. Post office and shipping services nearby

Flag any critical gaps (e.g., ER more than 10 minutes away, no pharmacy within 1 mile).
"""


async def run_convenience_agent(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    agent = build_agent(
        system_prompt=SYSTEM_PROMPT,
        tools=[search_yelp, get_commute_time, web_search],
        api_key=api_key,
    )
    user_msg = (
        f"Evaluate convenience and services for: {address} (zip: {zip_code})\n"
        f"Has pets: {profile.get('has_pets', False)}\n"
        f"Health conditions: {profile.get('health_conditions', [])}\n"
        f"Household: {profile.get('household', 'solo')}\n"
        f"Full profile: {profile}"
    )
    return await run_agent(agent, user_msg)
