"""
Rental Evaluator — MCP Server
==============================
Exposes the data-gathering tools as MCP tools so Claude (claude.ai or Claude Code)
can call them directly.  Claude handles all reasoning and scoring; this server
handles all external API calls.

No Anthropic / LLM API key is needed here — the user's Claude subscription
drives the intelligence.

Mount point: /mcp  (SSE transport, mounted inside the main FastAPI app)
"""
from __future__ import annotations
import json
import logging
from typing import Any

from mcp.server.fastmcp import FastMCP

from app.tools.yelp import search_yelp as _search_yelp
from app.tools.google_maps import get_commute_time as _get_commute_time
from app.tools.google_maps import get_transit_info as _get_transit_info
from app.tools.walkscore import get_walk_score as _get_walk_score
from app.tools.weather import get_weather_climate as _get_weather_climate
from app.tools.air_quality import get_air_quality as _get_air_quality
from app.tools.crime import get_crime_data as _get_crime_data
from app.tools.search import web_search as _web_search
from app.db import mcp_evaluations as mcp_db

logger = logging.getLogger(__name__)

# ── Server instance ────────────────────────────────────────────────────────────

mcp = FastMCP(
    name="Rental Evaluator",
    instructions=(
        "You are a rental property evaluator. "
        "Use the tools below to gather real data about an address, then reason "
        "over it to produce a persona-specific evaluation. "
        "IMPORTANT: Before starting any evaluation, call get_data_policy and "
        "share its contents with the user so they understand what gets stored."
    ),
)


# ── Disclaimer / data policy ──────────────────────────────────────────────────

@mcp.tool()
def get_data_policy() -> str:
    """
    Returns the data storage policy for this service.
    Call this first and show the result to the user before running any evaluation.
    """
    return (
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "  RENTAL EVALUATOR — DATA POLICY\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "When you save an evaluation result, the following is stored:\n"
        "  ✓  The property address you provided\n"
        "  ✓  The evaluation result (scores + summary)\n\n"
        "The following is NEVER stored:\n"
        "  ✗  Your name or any personal details\n"
        "  ✗  Your Claude account or session identity\n"
        "  ✗  Your lifestyle preferences or priorities\n"
        "  ✗  Any information that could identify you\n\n"
        "Stored results may be used to improve the service.\n"
        "You can opt out by simply not calling save_evaluation_result.\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )


# ── Data tools (thin wrappers over existing app/tools/) ───────────────────────

@mcp.tool()
def search_yelp(location: str, category: str, term: str = "", radius_miles: float = 2.0) -> str:
    """
    Search Yelp for businesses near a rental address.
    Use category values like: grocery, gyms, pharmacy, restaurants, parks.
    Use term to narrow results, e.g. 'Indian grocery', 'coffee shop'.
    radius_miles: search radius, max 25.
    """
    return _search_yelp.invoke({
        "location": location,
        "category": category,
        "term": term,
        "radius_miles": radius_miles,
    })


@mcp.tool()
def get_commute_time(origin: str, destination: str, mode: str = "transit") -> str:
    """
    Get commute time and distance between two addresses.
    mode: 'driving' | 'transit' | 'walking' | 'bicycling'
    Use this to check how the rental address connects to the user's workplace.
    """
    return _get_commute_time.invoke({
        "origin": origin,
        "destination": destination,
        "mode": mode,
        "departure_time": "now",
    })


@mcp.tool()
def get_transit_info(address: str) -> str:
    """
    List nearby transit stops and lines within ~0.5 miles of an address.
    Good for evaluating car-free or transit-dependent lifestyles.
    """
    return _get_transit_info.invoke({"address": address})


@mcp.tool()
def get_walk_score(address: str) -> str:
    """
    Get Walk Score, Transit Score, and Bike Score (0–100) for an address.
    90+ = Walker's / Rider's / Biker's Paradise. Use to assess walkability.
    """
    return _get_walk_score.invoke({"address": address})


@mcp.tool()
def get_weather_climate(zip_code: str) -> str:
    """
    Get current weather and climate context for a zip code.
    Useful for estimating heating/cooling utility costs.
    """
    return _get_weather_climate.invoke({"zip_code": zip_code})


@mcp.tool()
def get_air_quality(zip_code: str) -> str:
    """
    Get EPA AirNow Air Quality Index (AQI) for a zip code.
    Relevant for users with respiratory conditions or outdoor lifestyles.
    """
    return _get_air_quality.invoke({"zip_code": zip_code})


@mcp.tool()
def get_crime_data(zip_code: str) -> str:
    """
    Retrieve local crime data for a zip code.
    Currently returns a placeholder — use web_search for crime stats if needed.
    """
    return _get_crime_data.invoke({"zip_code": zip_code})


@mcp.tool()
def web_search(query: str) -> str:
    """
    Search the web for current information about a neighborhood, landlord,
    building reviews, local news, school ratings, or anything not covered
    by the other tools.
    """
    return _web_search.invoke({"query": query})


# ── Storage tool ───────────────────────────────────────────────────────────────

@mcp.tool()
def save_evaluation_result(address: str, result: dict[str, Any]) -> str:
    """
    Save the completed evaluation result to the database.

    IMPORTANT — read this before calling:
    Only the address and result JSON are stored. No user identity, preferences,
    or session data is saved. See get_data_policy for the full policy.
    Always inform the user about this before saving on their behalf.

    address: the full property address that was evaluated
    result:  a dict with keys like overall_score, summary, dimensions (scores per
             category). Shape is flexible — include whatever was produced.
    """
    try:
        row = mcp_db.save_mcp_evaluation(address=address, result=result)
        return (
            f"Evaluation saved (id: {row['id']}).\n"
            "Stored: address + result only. No personal data was recorded."
        )
    except Exception as e:
        logger.warning("Failed to save MCP evaluation: %s", e)
        return f"Could not save evaluation: {e}"


@mcp.tool()
def get_past_evaluations_for_address(address: str) -> str:
    """
    Look up previously saved evaluations for the same address.
    Returns up to 3 recent results so you can compare or reference prior data.
    No user identity is attached to these records.
    """
    try:
        rows = mcp_db.get_past_mcp_evaluations(address=address)
        if not rows:
            return f"No past evaluations found for '{address}'."
        lines = [f"Found {len(rows)} past evaluation(s) for '{address}':\n"]
        for r in rows:
            result = r.get("result", {})
            score = result.get("overall_score", "N/A")
            summary = result.get("summary", "")
            lines.append(f"• [{r['created_at'][:10]}] Score: {score}/100 — {summary}")
        return "\n".join(lines)
    except Exception as e:
        logger.warning("Failed to fetch past MCP evaluations: %s", e)
        return f"Could not retrieve past evaluations: {e}"
