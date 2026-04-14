import httpx
from langchain_core.tools import tool
from app.config import get_settings


@tool
def get_walk_score(address: str) -> str:
    """
    Get Walk Score, Transit Score, and Bike Score for an address (0–100 each).
    Higher is better. 90+ = Walker's/Rider's/Biker's Paradise.
    """
    settings = get_settings()
    if not settings.walkscore_api_key:
        return f"Walk score unavailable (WALKSCORE_API_KEY not configured)."
    if not settings.google_maps_api_key:
        return f"Walk score unavailable (GOOGLE_MAPS_API_KEY required for geocoding)."

    try:
        geo_params = {"address": address, "key": settings.google_maps_api_key}
        with httpx.Client(timeout=15) as client:
            geo_resp = client.get(
                "https://maps.googleapis.com/maps/api/geocode/json", params=geo_params
            )
            geo_resp.raise_for_status()
            geo_data = geo_resp.json()
            if not geo_data.get("results"):
                return f"Could not geocode address: {address}"
            loc = geo_data["results"][0]["geometry"]["location"]
            lat, lon = loc["lat"], loc["lng"]

            ws_params = {
                "format": "json",
                "address": address,
                "lat": lat,
                "lon": lon,
                "wsapikey": settings.walkscore_api_key,
                "transit": 1,
                "bike": 1,
            }
            ws_resp = client.get("https://api.walkscore.com/score", params=ws_params)
            ws_resp.raise_for_status()
            data = ws_resp.json()

        walk = data.get("walkscore", "N/A")
        walk_desc = data.get("description", "")
        transit = data.get("transit", {}).get("score", "N/A") if "transit" in data else "N/A"
        transit_desc = data.get("transit", {}).get("description", "") if "transit" in data else ""
        bike = data.get("bike", {}).get("score", "N/A") if "bike" in data else "N/A"
        bike_desc = data.get("bike", {}).get("description", "") if "bike" in data else ""

        return (
            f"Scores for {address}:\n"
            f"  Walk Score: {walk}/100 — {walk_desc}\n"
            f"  Transit Score: {transit}/100 — {transit_desc}\n"
            f"  Bike Score: {bike}/100 — {bike_desc}"
        )
    except Exception as e:
        return f"Walk score unavailable for {address}: {e}"
