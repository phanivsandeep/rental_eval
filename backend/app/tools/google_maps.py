import httpx
from langchain_core.tools import tool
from app.config import get_settings

MAPS_BASE = "https://maps.googleapis.com/maps/api"


@tool
def get_commute_time(origin: str, destination: str, mode: str = "transit", departure_time: str = "now") -> str:
    """
    Get commute time between two addresses.
    mode: 'driving' | 'transit' | 'walking' | 'bicycling'
    """
    key = get_settings().google_maps_api_key
    if not key:
        return "Commute data unavailable (GOOGLE_MAPS_API_KEY not configured)."

    params = {"origins": origin, "destinations": destination, "mode": mode, "key": key}
    if departure_time == "now":
        import time
        params["departure_time"] = str(int(time.time()))
    elif departure_time.isdigit():
        params["departure_time"] = departure_time

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{MAPS_BASE}/distancematrix/json", params=params)
            resp.raise_for_status()
        element = resp.json()["rows"][0]["elements"][0]
        if element["status"] != "OK":
            return f"Could not calculate route: {element['status']}"
        duration = element["duration"]["text"]
        distance = element["distance"]["text"]
        traffic = element.get("duration_in_traffic", {}).get("text", "")
        result = f"Commute ({mode}): {duration}, {distance}"
        if traffic:
            result += f" | With traffic: {traffic}"
        return result
    except Exception as e:
        return f"Commute calculation failed: {e}"


@tool
def get_transit_info(address: str) -> str:
    """Get nearby transit stops and available transit lines for an address."""
    key = get_settings().google_maps_api_key
    if not key:
        return "Transit info unavailable (GOOGLE_MAPS_API_KEY not configured)."

    params = {"location": address, "radius": 800, "type": "transit_station", "key": key}
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{MAPS_BASE}/place/nearbysearch/json", params=params)
            resp.raise_for_status()
        places = resp.json().get("results", [])
        if not places:
            return f"No transit stops found within 0.5 miles of {address}."
        lines = [f"Transit stops within 0.5 miles of {address}:"]
        for p in places[:8]:
            lines.append(f"- {p['name']} ({p.get('vicinity', '')})")
        return "\n".join(lines)
    except Exception as e:
        return f"Transit info unavailable: {e}"
