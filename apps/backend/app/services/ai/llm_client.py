from __future__ import annotations

import os
from typing import Any

try:
    from google import genai
except Exception:  # pragma: no cover
    genai = None


class LlmUnavailableError(Exception):
    pass


def llm_enabled() -> bool:
    return os.getenv("DEVLENS_LLM_ENABLED", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def get_llm_provider() -> str:
    return os.getenv("DEVLENS_LLM_PROVIDER", "gemini").strip().lower()


def get_llm_model() -> str:
    return os.getenv("DEVLENS_LLM_MODEL", "gemini-2.5-flash").strip()


def _get_gemini_client():
    if genai is None:
        raise LlmUnavailableError(
            "google-genai is not installed. Run: pip install google-genai"
        )

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise LlmUnavailableError("GEMINI_API_KEY is missing")

    return genai.Client(api_key=api_key)


def generate_text_with_llm(
    *,
    prompt: str,
    system_instruction: str | None = None,
    temperature: float = 0.3,
    max_output_tokens: int = 700,
) -> str:
    if not llm_enabled():
        raise LlmUnavailableError("LLM is disabled")

    provider = get_llm_provider()
    if provider != "gemini":
        raise LlmUnavailableError(f"Unsupported LLM provider: {provider}")

    client = _get_gemini_client()
    model = get_llm_model()

    final_prompt = prompt
    if system_instruction and system_instruction.strip():
        final_prompt = f"{system_instruction.strip()}\n\n{prompt.strip()}"

    try:
        response = client.models.generate_content(
            model=model,
            contents=final_prompt,
        )
        text = getattr(response, "text", None)
        if isinstance(text, str) and text.strip():
            return text.strip()
        raise LlmUnavailableError("LLM returned empty text")
    except Exception as exc:
        raise LlmUnavailableError(str(exc)) from exc