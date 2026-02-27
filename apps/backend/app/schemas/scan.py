import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


SourceType = Literal["github", "zip", "pr"]
ScanStatus = Literal["queued", "running", "completed", "failed"]


class ScanCreate(BaseModel):
    source_type: SourceType
    repo_url: Optional[str] = Field(default=None, max_length=500)
    pr_number: Optional[int] = None

    # Simple validation rules for v1
    # - github/pr needs repo_url
    # - pr needs pr_number
    def model_post_init(self, __context: Any) -> None:
        if self.source_type in ("github", "pr") and not self.repo_url:
            raise ValueError("repo_url is required for github/pr scans")
        if self.source_type == "pr" and self.pr_number is None:
            raise ValueError("pr_number is required for pr scans")


class ScanOut(BaseModel):
    id: uuid.UUID
    source_type: SourceType
    repo_url: Optional[str]
    pr_number: Optional[int]
    status: ScanStatus
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScanResultOut(BaseModel):
    scan_id: uuid.UUID
    result_json: dict[str, Any]