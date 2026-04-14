from __future__ import annotations
from typing import Any
from app.agents.base import build_agent, run_agent
from app.tools.yelp import search_yelp
from app.tools.search import web_search

SYSTEM_PROMPT = """You are the Food & Grocery Agent for a rental property evaluator.

Match food access to the user's cultural preferences and daily convenience needs.

Evaluate ALL of the following within 2 miles of the address:
1. Ethnic grocery stores matching the user's food culture (Indian, Asian, Hispanic, Middle Eastern, etc.)
2. General grocery chains (Safeway, Whole Foods, Trader Joe's, etc.) — distance and quality
3. Convenience store proximity and late-night access (7-Eleven, etc.)
4. Sit-down restaurant density by cuisine type matching user's preferences
5. Fast food proximity for daily convenience
6. Farmers markets if user's profile suggests interest
7. Food delivery service coverage and typical delivery time for this address

IMPORTANT: Heavily weight cultural food access matches. A South Asian user with no Indian grocery
within 2 miles is a major quality-of-life issue. Score accordingly.
"""


async def run_food_agent(
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
    food_prefs = profile.get("food_preferences", [])
    ethnicity = profile.get("ethnicity", "")

    user_msg = (
        f"Evaluate food and grocery access for: {address} (zip: {zip_code})\n"
        f"User's food preferences: {food_prefs}\n"
        f"Cultural background: {ethnicity}\n"
        f"Full profile: {profile}"
    )
    return await run_agent(agent, user_msg)
