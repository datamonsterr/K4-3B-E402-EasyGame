from __future__ import annotations

from .base import ModelResponse, Provider, ToolCall
from .gemini_provider import GeminiProvider
from .mock_provider import MockProvider


def make_provider(name: str = "mock", **kwargs) -> Provider:
    if name == "gemini":
        return GeminiProvider(**kwargs)
    if name == "mock":
        return MockProvider(**kwargs)
    raise ValueError(f"Unknown provider: {name}")
