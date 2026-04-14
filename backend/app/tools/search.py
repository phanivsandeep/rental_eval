from langchain_core.tools import tool
from app.config import get_settings


@tool
def web_search(query: str) -> str:
    """Search the web for current information about a location, landlord, neighborhood, etc."""
    key = get_settings().tavily_api_key
    if not key:
        return f"Web search unavailable (TAVILY_API_KEY not configured). Query was: {query}"

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=key)
        results = client.search(query=query, max_results=5)
        formatted = [
            f"## {r['title']}\n{r['url']}\n{r['content']}"
            for r in results.get("results", [])
        ]
        return "\n\n".join(formatted) if formatted else "No results found."
    except Exception as e:
        return f"Web search failed for '{query}': {e}"
