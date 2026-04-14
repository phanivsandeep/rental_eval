import httpx
from langchain_core.tools import tool
from app.config import get_settings


@tool
def get_weather_climate(zip_code: str) -> str:
    """Get current weather and climate context for a zip code for utility cost estimation."""
    key = get_settings().openweather_api_key
    if not key:
        return "Weather data unavailable (OPENWEATHER_API_KEY not configured)."

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"zip": f"{zip_code},US", "appid": key, "units": "imperial"},
            )
            resp.raise_for_status()
            data = resp.json()
        temp = data["main"]["temp"]
        feels = data["main"]["feels_like"]
        humidity = data["main"]["humidity"]
        desc = data["weather"][0]["description"]
        city = data.get("name", zip_code)
        return (
            f"Current weather in {city} (zip {zip_code}):\n"
            f"  Temperature: {temp}°F (feels like {feels}°F)\n"
            f"  Humidity: {humidity}%\n"
            f"  Conditions: {desc}\n"
            f"  Climate note: Use this to estimate heating/cooling costs."
        )
    except Exception as e:
        return f"Weather data unavailable for {zip_code}: {e}"
