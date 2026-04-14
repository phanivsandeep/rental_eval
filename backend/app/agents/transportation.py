from __future__ import annotations
from typing import Any
from app.agents.base import build_agent, run_agent
from app.tools.walkscore import get_walk_score
from app.tools.google_maps import get_commute_time, get_transit_info
from app.tools.crime import get_crime_data
from app.tools.search import web_search

SYSTEM_PROMPT = """You are the Transportation Agent for a rental property evaluator.

Evaluate commute and mobility. Branch based on the user's transportation type in their profile.

IF user has a car (transportation = 'car' or 'ev'):
- Street vs garage parking availability near address
- Parking permit requirements and monthly cost
- Car break-in and vehicle theft rates specifically
- Traffic congestion patterns at the user's commute hours
- Drive time to work address at commute hours
- Gas station proximity (or EV charging if ev user)

IF user has no car (transportation = 'no_car'):
- Transit lines serving the address (bus/train)
- Bus/train frequency — especially at the user's commute times
- Last service time (critical for night shift workers)
- Transit safety (crime at nearby stops)
- Walkability score
- Bike lane infrastructure and bike share availability
- Rideshare (Uber/Lyft) average availability for the area
- Commute time to work via transit

Always provide concrete data, not general statements.
"""


async def run_transportation_agent(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    agent = build_agent(
        system_prompt=SYSTEM_PROMPT,
        tools=[get_walk_score, get_commute_time, get_transit_info, get_crime_data, web_search],
        api_key=api_key,
    )
    work_location = profile.get("work_location", "not provided")
    transport = profile.get("transportation", "car")
    schedule = profile.get("work_schedule", "9-5")

    user_msg = (
        f"Evaluate transportation for: {address} (zip: {zip_code})\n"
        f"Transportation type: {transport}\n"
        f"Work location: {work_location}\n"
        f"Work schedule: {schedule}\n"
        f"Full profile: {profile}"
    )
    return await run_agent(agent, user_msg)
