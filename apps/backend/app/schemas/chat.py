from __future__ import annotations

from pydantic import BaseModel, Field


class ScanChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)


class ScanChatCitation(BaseModel):
    type: str
    label: str
    filePath: str | None = None
    section: str | None = None
    reason: str | None = None


class ScanChatResponse(BaseModel):
    answer: str
    citations: list[ScanChatCitation]
    matchedSections: list[str]
    confidence: str