from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .logistics_tools import (
    clarify_query,
    escalate_to_ta,
    generate_daily_digest,
    lookup_official_notices,
    resolve_question,
    scan_unanswered_radar,
)

TOOL_FUNCTIONS = {
    "lookup_official_notices": lookup_official_notices,
    "clarify_query": clarify_query,
    "escalate_to_ta": escalate_to_ta,
    "scan_unanswered_radar": scan_unanswered_radar,
    "generate_daily_digest": generate_daily_digest,
    "resolve_question": resolve_question,
}


def load_tool_declarations(path: Path) -> list[dict[str, Any]]:
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))["tools"]


def to_openai_tools(declarations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": item["name"],
                "description": item.get("description", ""),
                "parameters": item.get("parameters", {"type": "object", "properties": {}}),
            },
        }
        for item in declarations
    ]
