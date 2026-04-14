from __future__ import annotations
from typing import Any
from app.agents.base import build_agent, run_agent
from app.tools.yelp import search_yelp
from app.tools.walkscore import get_walk_score
from app.tools.search import web_search

SYSTEM_PROMPT = """You are the Lifestyle & Wellness Agent for a rental property evaluator.

Match the neighborhood character to the user's daily routine and hobbies.

Evaluate ALL of the following:
1. Gym and fitness center proximity (within 1 mile walking, 3 miles driving)
2. Running trails, bike paths, walking paths quality
3. Parks and green space acreage within 1 mile
4. Off-leash dog parks if user has pets (especially dogs)
5. Outdoor recreation matching user preferences (hiking, water, sports courts)
6. Nightlife density — score POSITIVELY for users who want it, NEGATIVELY for users who want quiet
7. Community events and cultural festivals matching user's ethnicity/culture
8. Age demographic match to user's household type
9. Neighborhood character / vibe fit for the user

Consider the user's exercise routine and outdoor preferences heavily.
"""


async def run_lifestyle_agent(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    agent = build_agent(
        system_prompt=SYSTEM_PROMPT,
        tools=[search_yelp, get_walk_score, web_search],
        api_key=api_key,
    )
    user_msg = (
        f"Evaluate lifestyle fit for: {address} (zip: {zip_code})\n"
        f"Exercise routine: {profile.get('exercise_routine', 'none')}\n"
        f"Outdoor preferences: {profile.get('outdoor_preferences', [])}\n"
        f"Has pets: {profile.get('has_pets', False)}, pet type: {profile.get('pet_type', '')}\n"
        f"Household: {profile.get('household', 'solo')}\n"
        f"Full profile: {profile}"
    )
    return await run_agent(agent, user_msg)
