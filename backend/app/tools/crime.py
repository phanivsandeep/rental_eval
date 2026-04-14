from langchain_core.tools import tool


@tool
def get_crime_data(zip_code: str) -> str:
    """
    Crime data lookup — currently on hold.
    Returns a placeholder so agents can continue without this data source.
    """
    return (
        f"Crime data for zip {zip_code} is currently unavailable "
        "(SpotCrime integration is pending). "
        "Please use web_search to find local crime statistics if needed."
    )
