from __future__ import annotations
from typing import Any
from app.agents.base import build_agent, run_agent
from app.tools.weather import get_weather_climate
from app.tools.search import web_search

SYSTEM_PROMPT = """You are the Utilities & Cost Agent for a rental property evaluator.

Estimate the true monthly cost of living beyond rent for this address.

Research and estimate ALL of the following:
1. Average electricity bill for the zip code and climate (use weather data)
2. Average gas/heating bill estimate based on climate
3. Internet providers available at or near this address — speeds and monthly prices
4. Cell signal strength by major carrier (AT&T, Verizon, T-Mobile) for this area
5. Parking permit monthly cost if applicable (car users)
6. Estimated renter's insurance for the zip code
7. Water bill estimates for the area
8. Overall monthly cost-of-living estimate beyond rent

Output your findings AND a structured monthly_cost_estimate JSON object embedded in your details.
The monthly_cost_estimate should include: rent (use user's budget), electricity, gas, internet,
transit_pass (if no_car), parking (if car), renters_insurance, total_estimate.
"""


async def run_utilities_agent(
    address: str,
    zip_code: str,
    profile: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    agent = build_agent(
        system_prompt=SYSTEM_PROMPT,
        tools=[get_weather_climate, web_search],
        api_key=api_key,
    )
    user_msg = (
        f"Evaluate utilities and costs for: {address} (zip: {zip_code})\n"
        f"Monthly rent budget: ${profile.get('budget', 2000)}\n"
        f"Transportation: {profile.get('transportation', 'car')}\n"
        f"Full profile: {profile}"
    )
    return await run_agent(agent, user_msg)
