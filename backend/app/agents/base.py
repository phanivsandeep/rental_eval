"""Shared prompt template and agent factory for all subagents."""
from __future__ import annotations
from typing import Any
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import BaseTool
from langgraph.prebuilt import create_react_agent


SUBAGENT_OUTPUT_INSTRUCTIONS = """
After completing your research, output ONLY a valid JSON object with this exact structure:
{
  "match_score": <integer 0-100>,
  "summary": "<one sentence describing how well this dimension matches THIS user's needs>",
  "details": "<multi-paragraph detailed findings>"
}

match_score is NOT a general quality rating — it measures how well this specific dimension
aligns with THIS user's stated preferences, lifestyle, and priorities:
  80-100 : Strong match to this user's specific needs
  60-79  : Generally good match, minor gaps
  40-59  : Moderate mismatch with their stated preferences
  20-39  : Significant mismatch — this dimension works against their priorities
  0-19   : Critical mismatch — this user's core needs are not met here

Do not include any text before or after the JSON object.
"""


def build_agent(
    system_prompt: str,
    tools: list[BaseTool],
    api_key: str,
    model: str = "claude-sonnet-4-6",
) -> Any:
    llm = ChatAnthropic(
        model=model,
        api_key=api_key,
        max_tokens=4096,
        timeout=30,
    )
    full_prompt = system_prompt + "\n\n" + SUBAGENT_OUTPUT_INSTRUCTIONS
    return create_react_agent(llm, tools, prompt=full_prompt)


async def run_agent(agent: Any, user_message: str) -> dict[str, Any]:
    """Run agent and parse JSON output. Returns fallback on failure."""
    import json, re
    result = await agent.ainvoke({"messages": [("user", user_message)]})
    # Extract last AI message content
    content = ""
    for msg in reversed(result["messages"]):
        if hasattr(msg, "content") and isinstance(msg.content, str) and msg.content.strip():
            content = msg.content.strip()
            break

    # Find JSON block
    json_match = re.search(r'\{.*\}', content, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return {
        "match_score": 50,
        "summary": "Data temporarily unavailable",
        "details": content or "Agent did not return structured output.",
    }
