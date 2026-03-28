from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel


CompareVerdict = Literal["improved", "regressed", "unchanged"]
RankDirection = Literal["improved", "regressed", "new", "resolved", "unchanged"]


class CompareSeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class CompareOverview(BaseModel):
    baseHealthScore: int | float | None = None
    targetHealthScore: int | float | None = None
    healthScoreDelta: int | float = 0

    baseGrade: str | None = None
    targetGrade: str | None = None
    gradeChanged: bool = False


class CompareFindingItem(BaseModel):
    fingerprint: str
    id: str | None = None
    title: str | None = None
    ruleId: str | None = None
    severity: str | None = None
    filePath: str | None = None
    message: str | None = None
    type: str | None = None


class CompareFindingsSection(BaseModel):
    baseCounts: CompareSeverityCounts
    targetCounts: CompareSeverityCounts
    deltas: CompareSeverityCounts
    newFindings: list[CompareFindingItem] = []
    resolvedFindings: list[CompareFindingItem] = []


class CompareRefactorFileChange(BaseModel):
    filePath: str
    baseRank: int | None = None
    targetRank: int | None = None
    direction: RankDirection
    basePriorityScore: int | None = None
    targetPriorityScore: int | None = None
    priorityScoreDelta: int | None = None


class CompareRefactorSection(BaseModel):
    topChangedFiles: list[CompareRefactorFileChange] = []


class CompareArchitectureSection(BaseModel):
    baseRiskScore: int = 0
    targetRiskScore: int = 0
    riskDelta: int = 0

    possibleGodFilesDelta: int = 0
    hotspotDirectoriesDelta: int = 0
    architectureSmellsDelta: int = 0
    couplingHotspotsDelta: int = 0
    dependencyHubsDelta: int = 0
    boundaryWarningsDelta: int = 0


class CompareMLSection(BaseModel):
    basePredictedRiskScore: int | float | None = None
    targetPredictedRiskScore: int | float | None = None
    riskScoreDelta: int | float = 0

    basePredictedDebtScore: int | float | None = None
    targetPredictedDebtScore: int | float | None = None
    debtScoreDelta: int | float = 0

    basePredictedRiskLevel: str | None = None
    targetPredictedRiskLevel: str | None = None
    basePredictedDebtLevel: str | None = None
    targetPredictedDebtLevel: str | None = None


class ScanCompareOut(BaseModel):
    baseScanId: uuid.UUID
    targetScanId: uuid.UUID
    verdict: CompareVerdict
    summary: str

    overview: CompareOverview
    findings: CompareFindingsSection
    refactor: CompareRefactorSection
    architecture: CompareArchitectureSection
    ml: CompareMLSection