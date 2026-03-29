import uuid
from datetime import datetime

from pydantic import BaseModel


class TeamOverviewSummary(BaseModel):
    total_scans: int
    completed_scans: int
    average_health_score: float | None
    average_predicted_risk_score: float | None
    average_predicted_debt_score: float | None


class TeamDistributionItem(BaseModel):
    label: str
    count: int


class TeamRepoRiskItem(BaseModel):
    repo_key: str
    repo_label: str
    completed_scans: int
    average_health_score: float | None
    average_predicted_risk_score: float | None
    average_predicted_debt_score: float | None
    latest_scan_id: uuid.UUID | None
    latest_scan_created_at: datetime | None


class TeamTrendItem(BaseModel):
    date: str
    completed_scans: int
    average_health_score: float | None
    average_predicted_risk_score: float | None
    average_predicted_debt_score: float | None


class TeamLatestScanItem(BaseModel):
    scan_id: uuid.UUID
    repo_key: str
    repo_label: str
    source_type: str
    status: str
    health_score: float | None
    grade: str | None
    predicted_risk_score: float | None
    predicted_risk_level: str | None
    predicted_debt_score: float | None
    predicted_debt_level: str | None
    created_at: datetime


class TeamOverviewOut(BaseModel):
    summary: TeamOverviewSummary
    grade_distribution: list[TeamDistributionItem]
    risk_level_distribution: list[TeamDistributionItem]
    top_risky_repos: list[TeamRepoRiskItem]
    recent_trend: list[TeamTrendItem]
    latest_completed_scans: list[TeamLatestScanItem]