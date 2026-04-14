import httpx
from langchain_core.tools import tool
from app.config import get_settings

YELP_BASE = "https://api.yelp.com/v3"


@tool
def search_yelp(location: str, category: str, term: str = "", radius_miles: float = 2.0) -> str:
    """
    Search Yelp for businesses near a location.
    category: e.g. 'grocery', 'gyms', 'pharmacy', 'restaurants', 'parks'
    term: optional search term to narrow results, e.g. 'Indian grocery'
    radius_miles: search radius (max 25 miles)
    """
    api_key = get_settings().yelp_api_key
    if not api_key:
        return f"Yelp data unavailable (YELP_API_KEY not configured) — use web_search instead."

    radius_meters = min(int(radius_miles * 1609), 40000)
    params: dict = {
        "location": location,
        "categories": category,
        "radius": radius_meters,
        "limit": 10,
        "sort_by": "distance",
    }
    if term:
        params["term"] = term

    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{YELP_BASE}/businesses/search", params=params, headers=headers)
            resp.raise_for_status()
        businesses = resp.json().get("businesses", [])
    except Exception as e:
        return f"Yelp search failed for '{term or category}' near {location}: {e}"

    if not businesses:
        return f"No results found for '{term or category}' near {location}."

    lines = [f"Found {len(businesses)} businesses for '{term or category}' near {location}:\n"]
    for b in businesses:
        dist_mi = round(b.get("distance", 0) / 1609, 2)
        hours_info = ""
        if b.get("hours"):
            hours_info = " | Open now" if b["hours"][0].get("is_open_now") else " | Currently closed"
        lines.append(
            f"- {b['name']} ({dist_mi} mi) | Rating: {b.get('rating', 'N/A')} "
            f"({b.get('review_count', 0)} reviews) | Price: {b.get('price', 'N/A')}{hours_info}"
        )
    return "\n".join(lines)
