import httpx
from langchain_core.tools import tool
from app.config import get_settings


@tool
def get_air_quality(zip_code: str) -> str:
    """Get EPA AirNow air quality index (AQI) for a zip code."""
    key = get_settings().epa_api_key
    if not key:
        return f"Air quality data unavailable (EPA_API_KEY not configured)."

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                "https://www.airnowapi.org/aq/observation/zipCode/current/",
                params={"format": "application/json", "zipCode": zip_code,
                        "distance": 25, "API_KEY": key},
            )
            resp.raise_for_status()
            observations = resp.json()
        if not observations:
            return f"No AQI data available for zip {zip_code}."
        lines = [f"Air quality for zip {zip_code}:"]
        for obs in observations:
            lines.append(
                f"  {obs.get('ParameterName', 'Unknown')}: AQI {obs.get('AQI', 'N/A')} "
                f"({obs.get('Category', {}).get('Name', 'N/A')})"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Air quality data unavailable for {zip_code}: {e}"
