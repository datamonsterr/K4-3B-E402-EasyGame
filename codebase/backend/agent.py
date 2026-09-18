from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from providers.base import ModelResponse, Provider, ToolCall
from tools import TOOL_FUNCTIONS, load_tool_declarations, to_openai_tools

ROOT = Path(__file__).resolve().parent
SYSTEM_PROMPT_PATH = ROOT / "artifacts" / "system_prompt.md"
TOOLS_DECLARATIONS_PATH = ROOT / "artifacts" / "tools.yaml"


@dataclass
class AgentRun:
    text: str | None
    tool_calls: list[ToolCall] = field(default_factory=list)
    tool_results: list[dict[str, Any]] = field(default_factory=list)


def load_default_system_prompt() -> str:
    if SYSTEM_PROMPT_PATH.exists():
        return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    return "You are the verified logistics assistant for K4 E402 EasyGame."


def load_default_tools() -> list[dict[str, Any]]:
    if TOOLS_DECLARATIONS_PATH.exists():
        decls = load_tool_declarations(TOOLS_DECLARATIONS_PATH)
        return to_openai_tools(decls)
    return []


class DiscordLogisticsAgentHarness:
    """
    Agent Harness executing the loop between System Prompt, LLM Provider,
    and Registered Tool Functions for Track B (Logistics & Radar).
    """

    def __init__(
        self,
        provider: Provider,
        *,
        system_prompt: Optional[str] = None,
        tools: Optional[list[dict[str, Any]]] = None,
        model: Optional[str] = None,
        tool_executor: Any = None,
    ) -> None:
        self.provider = provider
        self.system_prompt = system_prompt or load_default_system_prompt()
        self.tools = tools if tools is not None else load_default_tools()
        self.model = model
        self.tool_executor = tool_executor

    def run(self, user_messages: list[dict[str, str]], *, tool_choice: Any = None) -> AgentRun:
        messages = [{"role": "system", "content": self.system_prompt}, *user_messages]
        response = self.provider.complete(
            messages,
            self.tools,
            model=self.model,
            temperature=0.0,
            tool_choice=tool_choice,
        )

        results: list[dict[str, Any]] = []
        for call in response.tool_calls:
            if self.tool_executor is not None:
                results.append(self.tool_executor(call))
                continue

            func = TOOL_FUNCTIONS.get(call.name)
            if not func:
                results.append({"tool": call.name, "error": "unknown_tool"})
                continue

            try:
                result = func(**call.args)
            except Exception as exc:
                result = {"error": type(exc).__name__, "message": str(exc)}
            results.append({"tool": call.name, "args": call.args, "result": result})

        return AgentRun(text=response.text, tool_calls=response.tool_calls, tool_results=results)
