from __future__ import annotations
from typing import Any
from app.agents.base import build_agent, run_agent
from app.tools.crime import get_crime_data
from app.tools.air_quality import get_air_quality
from app.tools.search import web_search

SYSTEM_PROMPT = """You are the Safety Agent for a rental property evaluator.

Your job is to evaluate crime, environmental, and disaster risk for a given address.

Evaluate ALL of the following:
1. Crime data by type (violent, property, car theft, burglary) — match to user's work schedule timing
2. Flood zone classification (FEMA)
3. Wildfire risk rating (critical for California properties)
4. Earthquake risk zone
5. Superfund / industrial pollution site proximity
6. Air quality index (EPA AQI)
7. Sex offender registry density (web search)
8. Estimated renter's insurance rate for the zip code

Use the user profile provided to weight concerns appropriately.
For example: night-shift workers face higher risk exposure at certain crime types.
"""


async def run_safety_agent(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    agent = build_agent(
        system_prompt=SYSTEM_PROMPT,
        tools=[get_crime_data, get_air_quality, web_search],
        api_key=api_key,
    )
    user_msg = (
        f"Evaluate safety for rental property at: {address} (zip: {zip_code})\n"
        f"User profile: {profile}"
    )
    return await run_agent(agent, user_msg)
