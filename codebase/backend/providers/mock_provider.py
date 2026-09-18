from __future__ import annotations

from typing import Any

from .base import ModelResponse, ToolCall


class MockProvider:
    """Deterministic Mock Provider for testing agent flow & harnesses."""

    def __init__(self, fixed_responses: list[ModelResponse] | None = None):
        self.fixed_responses = fixed_responses or []
        self._index = 0

    def complete(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        *,
        model: str | None = None,
        temperature: float = 0.0,
        tool_choice: Any | None = None,
    ) -> ModelResponse:
        if self._index < len(self.fixed_responses):
            resp = self.fixed_responses[self._index]
            self._index += 1
            return resp

        # Default intelligent routing mock
        last_msg = messages[-1]["content"].lower() if messages else ""

        if "bỏ qua" in last_msg or "ignore" in last_msg:
            return ModelResponse(
                text="Mình là Trợ lý hỗ trợ logistics khóa học. Mình chỉ cung cấp thông tin dựa trên thông báo chính thức và không thể thay đổi quy chế."
            )
        if "hạn nộp là khi nào" in last_msg or "deadline khi nào" in last_msg:
            return ModelResponse(
                tool_calls=[
                    ToolCall(
                        name="clarify_query",
                        args={
                            "question": "Bạn muốn hỏi hạn nộp của Lab 1 hay các mốc Checkpoint CP1–CP6?",
                            "options": ["Hạn nộp Lab 1", "Lịch Checkpoint CP1-CP6"],
                        },
                    )
                ]
            )
        if "lab 1" in last_msg:
            return ModelResponse(
                tool_calls=[
                    ToolCall(name="lookup_official_notices", args={"topic": "lab_1"})
                ]
            )
        if "checkpoint" in last_msg or "cp1" in last_msg:
            return ModelResponse(
                tool_calls=[
                    ToolCall(name="lookup_official_notices", args={"topic": "checkpoint"})
                ]
            )
        if "lab 07" in last_msg or "lab 7" in last_msg:
            return ModelResponse(
                tool_calls=[
                    ToolCall(
                        name="escalate_to_ta",
                        args={
                            "student_name": "Student",
                            "issue_summary": "Hỏi deadline Lab 07 chưa có thông báo chính thức",
                        },
                    )
                ]
            )

        return ModelResponse(
            tool_calls=[
                ToolCall(name="lookup_official_notices", args={"query": last_msg})
            ]
        )
