from langchain_core.tools import tool
from app.tools.search import web_search


@tool
def get_crime_data(zip_code: str) -> str:
    """
    Get local crime statistics and safety information for a zip code.
    Searches public crime reports, police data, and neighborhood safety sources.
    """
    results = []

    queries = [
        f"crime rate statistics zip code {zip_code} site:crimegrade.org OR site:neighborhoodscout.com OR site:areavibes.com",
        f"{zip_code} neighborhood crime safety police report 2024",
    ]

    for q in queries:
        result = web_search.invoke({"query": q})
        if "unavailable" not in result.lower() and "failed" not in result.lower():
            results.append(result)

    if not results:
        return (
            f"Crime data for zip {zip_code} could not be retrieved. "
            "Try searching 'crime rate [zip code]' on crimegrade.org or areavibes.com."
        )

    return f"Crime & safety data for zip {zip_code}:\n\n" + "\n\n---\n\n".join(results)
