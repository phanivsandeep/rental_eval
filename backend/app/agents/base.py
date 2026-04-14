"""Shared prompt template and agent factory for all subagents."""
from __future__ import annotations
from typing import Any
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import BaseTool
from langgraph.prebuilt import create_react_agent


SUBAGENT_OUTPUT_INSTRUCTIONS = """
After completing your research, output ONLY a valid JSON object with this exact structure:
{
  "score": <integer 0-100>,
  "summary": "<one sentence summary>",
  "details": "<multi-paragraph detailed findings>"
}
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
        "score": 50,
        "summary": "Data temporarily unavailable",
        "details": content or "Agent did not return structured output.",
    }
