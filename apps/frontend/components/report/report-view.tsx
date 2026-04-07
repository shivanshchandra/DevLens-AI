"use client"

import { useMemo, useState, useRef, useEffect } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

import { ScanChat } from "@/components/chat/scan-chat"
import { AiSummaryCard } from "@/components/dashboard/ai-summary-card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { FindingsTable } from "@/components/dashboard/findings-table"
import { InfoPairGrid } from "@/components/dashboard/info-pair-grid"
import { InsightListCard } from "@/components/dashboard/insight-list-card"
import { LanguageChart } from "@/components/dashboard/language-chart"
import { MetricsGrid } from "@/components/dashboard/metrics-grid"
import { RecommendedActionsCard } from "@/components/dashboard/recommended-actions-card"
import { ScanSummaryBar } from "@/components/dashboard/scan-summary-bar"
import { SectionHeader } from "@/components/dashboard/section-header"
import { SeverityChart } from "@/components/dashboard/severity-chart"
import { StatHighlightCard } from "@/components/dashboard/stat-highlight-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { TabSectionShell } from "@/components/dashboard/tab-section-shell"
import { TopRisksCard } from "@/components/dashboard/top-risks-card"
import type {
  Finding,
  FindingSeverity,
  FindingType,
  FixSuggestion,
  RefactorPriorityItem,
  ScanResults,
  TopContributingFile,
} from "@/lib/api/client"

type Results = ScanResults

type FindingsTableItem = {
  id: string
  type: FindingType
  title: string
  severity: FindingSeverity
  filePath: string
  ruleId?: string
  message: string
}

type MlSummary = {
  predictedDebtLevel?: string
  predictedDebtScore?: number
  predictedRiskLevel?: string
  predictedRiskScore?: number
}

type MlExplanationDetail = {
  title?: string
  narrative?: string
  reasons?: string[]
  drivers?: string[]
}

type AiRiskExplanation = {
  title?: string
  level?: string
  narrative?: string
  bullets?: string[]
}

type AiRefactorPlan = {
  title?: string
  steps?: string[]
}

type AiInsightsNormalized = {
  summary?: string
  riskExplanation?: AiRiskExplanation
  refactorPlan?: AiRefactorPlan
  grounding?: {
    healthScore?: number
    grade?: string
    totalFindings?: number
    criticalCount?: number
    highCount?: number
    architectureRiskLevel?: string | null
    couplingHotspots?: number
    dependencyHubs?: number
    predictedRiskLevel?: string | null
    predictedDebtLevel?: string | null
    topRefactorTargets?: string[]
  }
}

type NormalizedFixSuggestion = {
  id: string
  title: string
  why: string
  filePath?: string
  priority?: string
  recommendedAction?: string
  saferAlternative?: string | null
}

type NormalizedRefactorTarget = {
  id: string
  filePath: string
  score?: number
  estimatedEffort?: string
  recommendedAction?: string
  reasons: string[]
  source:
    | "backend_top_files_to_fix"
    | "recommendations_topFilesToFix"
    | "ml_refactorPriority"
    | "topContributingFiles"
    | "complexityHotspots"
}

type ArchitectureSummary = {
  totalFilesAnalyzed?: number
  totalLocAnalyzed?: number
  possibleGodFiles?: number
  hotspotDirectories?: number
  architectureSmells?: number
  architectureRiskScore?: number
  architectureRiskLevel?: string
  couplingHotspots?: number
  dependencyHubs?: number
  boundaryWarnings?: number
  directoryCouplingHotspots?: number
}

type ArchitectureDirectoryHotspot = {
  directoryPath: string
  fileCount?: number
  loc?: number
  locShare?: number
  issueCount?: number
  hotspotCount?: number
  score?: number
}

type ArchitectureFileHotspot = {
  filePath: string
  loc?: number
  findingCount?: number
  hotspotScore?: number
  score?: number
  reasons?: string[]
}

type ArchitectureSmell = {
  id?: string
  title?: string
  severity?: string
  message?: string
  recommendation?: string
}

type CouplingHotspot = {
  filePath: string
  internalImportCount?: number
  internalInboundCount?: number
  score?: number
  reasons?: string[]
}

type DependencyHub = {
  filePath: string
  inboundDependencyCount?: number
  score?: number
  reasons?: string[]
}

type BoundaryWarning = {
  sourceDirectory: string
  targetDirectory: string
  crossImportCount?: number
  severity?: string
  message?: string
}

type DirectoryCouplingHotspot = {
  directoryPath: string
  crossImportCount?: number
  uniqueTargetDirectories?: number
  score?: number
}

function normalizeFindingsForTable(findings: Finding[]): FindingsTableItem[] {
  return findings.map((finding, index) => ({
    id: finding.id ?? `${finding.type}-${finding.filePath ?? "file"}-${index}`,
    type:
      finding.ruleId === "CYCLO_COMPLEXITY"
        ? ("complexity" as FindingType)
        : finding.type,
    title: finding.title,
    severity: finding.severity,
    filePath: finding.filePath ?? "—",
    ruleId: finding.ruleId,
    message: finding.message ?? "",
  }))
}

function severityCounts(findings: Finding[]) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 }

  for (const f of findings) {
    if (f.severity in counts) {
      counts[f.severity as keyof typeof counts]++
    }
  }

  return counts
}

function formatScore(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—"
  return value.toFixed(2)
}

function titleCase(value?: string | null) {
  if (!value) return "—"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeLanguages(results: Results) {
  const raw = results.metrics?.languages ?? []

  if (Array.isArray(raw)) {
    return raw.map((item: any) => ({
      name: String(item?.name ?? "Unknown"),
      percent: Number(item?.percent ?? 0),
    }))
  }

  return Object.entries(raw).map(([name, percent]) => ({
    name,
    percent: Number(percent ?? 0),
  }))
}

function normalizeArchitecture(results: Results) {
  const architecture = (results as any).architecture ?? {}
  const summariesArchitecture = results.summaries?.architecture ?? {}

  const summary: ArchitectureSummary =
    architecture.summary ?? summariesArchitecture ?? {}

  const directoryHotspots: ArchitectureDirectoryHotspot[] =
    architecture.directoryHotspots ?? []

  const fileHotspots: ArchitectureFileHotspot[] =
    architecture.fileHotspots ?? []

  const possibleGodFiles: ArchitectureFileHotspot[] =
    architecture.possibleGodFiles ?? []

  const smells: ArchitectureSmell[] = architecture.smells ?? []
  const recommendations: string[] = architecture.recommendations ?? []
  const couplingHotspots: CouplingHotspot[] = architecture.couplingHotspots ?? []
  const dependencyHubs: DependencyHub[] = architecture.dependencyHubs ?? []
  const boundaryWarnings: BoundaryWarning[] = architecture.boundaryWarnings ?? []
  const directoryCouplingHotspots: DirectoryCouplingHotspot[] =
    architecture.directoryCouplingHotspots ?? []

  return {
    summary,
    directoryHotspots,
    fileHotspots,
    possibleGodFiles,
    smells,
    recommendations,
    couplingHotspots,
    dependencyHubs,
    boundaryWarnings,
    directoryCouplingHotspots,
    hasArchitecture:
      !!summary?.architectureRiskLevel ||
      directoryHotspots.length > 0 ||
      fileHotspots.length > 0 ||
      possibleGodFiles.length > 0 ||
      smells.length > 0 ||
      recommendations.length > 0 ||
      couplingHotspots.length > 0 ||
      dependencyHubs.length > 0 ||
      boundaryWarnings.length > 0 ||
      directoryCouplingHotspots.length > 0,
  }
}

function normalizeMl(results: Results) {
  const ml = results.ml ?? {}
  const summary = ml.summary as MlSummary | string | undefined

  const riskPrediction =
    ml.riskPrediction ??
    results.riskPrediction ??
    (summary && typeof summary !== "string"
      ? {
          level: summary.predictedRiskLevel,
          score: summary.predictedRiskScore,
        }
      : undefined)

  const technicalDebtPrediction =
    ml.technicalDebtPrediction ??
    results.technicalDebtPrediction ??
    (summary && typeof summary !== "string"
      ? {
          level: summary.predictedDebtLevel,
          score: summary.predictedDebtScore,
        }
      : undefined)

  const explanationsRoot = ml.explanations ?? {}

  const riskExplanation: MlExplanationDetail | undefined =
    explanationsRoot.risk ?? results.explanations?.risk

  const technicalDebtExplanation: MlExplanationDetail | undefined =
    explanationsRoot.technicalDebt ?? results.explanations?.technicalDebt

  const topContributingFiles: TopContributingFile[] =
    ml.topContributingFiles ??
    results.topContributingFiles ??
    explanationsRoot.topContributingFiles ??
    []

  const nextActions: string[] =
    ml.nextActions ??
    results.nextActions ??
    explanationsRoot.nextActions ??
    []

  const summaryText =
    typeof summary === "string"
      ? summary
      : summary
        ? `Predicted risk is ${summary.predictedRiskLevel ?? "unknown"} (${formatScore(
            summary.predictedRiskScore
          )}) and predicted technical debt is ${
            summary.predictedDebtLevel ?? "unknown"
          } (${formatScore(summary.predictedDebtScore)}).`
        : typeof results.summary === "string"
          ? results.summary
          : undefined

  return {
    riskPrediction,
    technicalDebtPrediction,
    riskExplanation,
    technicalDebtExplanation,
    topContributingFiles,
    nextActions,
    summaryText,
  }
}

function normalizeAi(results: Results): AiInsightsNormalized {
  return {
    summary: results.ai?.summary,
    riskExplanation: results.ai?.riskExplanation,
    refactorPlan: results.ai?.refactorPlan,
    grounding: results.ai?.grounding,
  }
}

function normalizeFixSuggestions(results: Results): {
  items: NormalizedFixSuggestion[]
  source:
    | "backend_fix_suggestions"
    | "recommendations_fixSuggestions"
    | "ml_fixSuggestions"
    | "nextActions_fallback"
    | "none"
} {
  const backendFixSuggestions: FixSuggestion[] = results.fix_suggestions ?? []
  const recommendationsFixSuggestions: FixSuggestion[] =
    results.recommendations?.fixSuggestions ?? []
  const mlFixSuggestions: FixSuggestion[] = results.ml?.fixSuggestions ?? []

  if (backendFixSuggestions.length > 0) {
    return {
      source: "backend_fix_suggestions",
      items: backendFixSuggestions.map((item, index) => ({
        id: item.findingId ?? item.id ?? `fix-${index}`,
        title: item.title ?? "Suggested remediation",
        why: item.why ?? item.description ?? "No explanation available.",
        filePath: item.filePath,
        priority: item.priority ?? item.severity,
        recommendedAction: item.recommendedAction ?? item.action,
        saferAlternative: item.saferAlternative,
      })),
    }
  }

  if (recommendationsFixSuggestions.length > 0) {
    return {
      source: "recommendations_fixSuggestions",
      items: recommendationsFixSuggestions.map((item, index) => ({
        id: item.findingId ?? item.id ?? `fix-${index}`,
        title: item.title ?? "Suggested remediation",
        why: item.why ?? item.description ?? "No explanation available.",
        filePath: item.filePath,
        priority: item.priority ?? item.severity,
        recommendedAction: item.recommendedAction ?? item.action,
        saferAlternative: item.saferAlternative,
      })),
    }
  }

  if (mlFixSuggestions.length > 0) {
    return {
      source: "ml_fixSuggestions",
      items: mlFixSuggestions.map((item, index) => ({
        id: item.findingId ?? item.id ?? `fix-${index}`,
        title: item.title ?? item.summary ?? "Suggested remediation",
        why: item.why ?? item.description ?? "No explanation available.",
        filePath: item.filePath,
        priority: item.priority ?? item.severity,
        recommendedAction: item.recommendedAction ?? item.action,
        saferAlternative: item.saferAlternative,
      })),
    }
  }

  if ((results.nextActions ?? []).length > 0 || (results.ml?.nextActions ?? []).length > 0) {
    const actions = results.nextActions ?? results.ml?.nextActions ?? []
    return {
      source: "nextActions_fallback",
      items: actions.map((action, index) => ({
        id: `next-action-${index}`,
        title: `Suggested quick win #${index + 1}`,
        why: "Dedicated backend fix suggestions were not present, so this fallback uses generated next actions.",
        filePath: undefined,
        priority: undefined,
        recommendedAction: action,
        saferAlternative: null,
      })),
    }
  }

  return { source: "none", items: [] }
}

function normalizeRefactorTargets(
  results: Results,
  topContributingFiles: TopContributingFile[]
): {
  items: NormalizedRefactorTarget[]
  source:
    | "backend_top_files_to_fix"
    | "recommendations_topFilesToFix"
    | "ml_refactorPriority"
    | "topContributingFiles"
    | "complexityHotspots"
    | "none"
} {
  const backendTopFilesToFix: RefactorPriorityItem[] = results.top_files_to_fix ?? []
  const recommendationsTopFilesToFix: RefactorPriorityItem[] =
    results.recommendations?.topFilesToFix ?? []
  const mlRefactorPriority: RefactorPriorityItem[] =
    results.ml?.refactorPriority ?? []

  if (backendTopFilesToFix.length > 0) {
    return {
      source: "backend_top_files_to_fix",
      items: backendTopFilesToFix.map((item, index) => ({
        id: item.id ?? `top-files-to-fix-${index}`,
        filePath: item.filePath,
        score: item.priorityScore ?? item.contributionScore,
        estimatedEffort: item.estimatedEffort,
        recommendedAction: item.recommendedAction ?? item.title,
        reasons: item.reasons ?? (item.reason ? [item.reason] : []),
        source: "backend_top_files_to_fix",
      })),
    }
  }

  if (recommendationsTopFilesToFix.length > 0) {
    return {
      source: "recommendations_topFilesToFix",
      items: recommendationsTopFilesToFix.map((item, index) => ({
        id: item.id ?? `recommendations-top-files-${index}`,
        filePath: item.filePath,
        score: item.priorityScore ?? item.contributionScore,
        estimatedEffort: item.estimatedEffort,
        recommendedAction: item.recommendedAction ?? item.title,
        reasons: item.reasons ?? (item.reason ? [item.reason] : []),
        source: "recommendations_topFilesToFix",
      })),
    }
  }

  if (mlRefactorPriority.length > 0) {
    return {
      source: "ml_refactorPriority",
      items: mlRefactorPriority.map((item, index) => ({
        id: item.id ?? `ml-refactor-${index}`,
        filePath: item.filePath,
        score: item.priorityScore ?? item.contributionScore,
        estimatedEffort: item.estimatedEffort,
        recommendedAction: item.recommendedAction ?? item.title,
        reasons: item.reasons ?? (item.reason ? [item.reason] : []),
        source: "ml_refactorPriority",
      })),
    }
  }

  if (topContributingFiles.length > 0) {
    return {
      source: "topContributingFiles",
      items: topContributingFiles.map((item, index) => ({
        id: `top-contrib-${index}`,
        filePath: item.filePath,
        score: item.priorityScore ?? item.contributionScore,
        estimatedEffort: item.estimatedEffort,
        recommendedAction: item.recommendedAction,
        reasons: item.reasons ?? [],
        source: "topContributingFiles",
      })),
    }
  }

  if ((results.metrics?.complexityHotspots ?? []).length > 0) {
    return {
      source: "complexityHotspots",
      items: results.metrics.complexityHotspots.slice(0, 5).map((item, index) => ({
        id: `hotspot-${index}`,
        filePath: item.filePath,
        score: item.score,
        estimatedEffort: undefined,
        recommendedAction:
          "Dedicated backend refactor targets were not present, so this fallback uses complexity hotspots.",
        reasons: ["Complexity hotspot fallback"],
        source: "complexityHotspots",
      })),
    }
  }

  return { source: "none", items: [] }
}

function sourceLabel(
  source:
    | "backend_fix_suggestions"
    | "recommendations_fixSuggestions"
    | "ml_fixSuggestions"
    | "nextActions_fallback"
    | "backend_top_files_to_fix"
    | "recommendations_topFilesToFix"
    | "ml_refactorPriority"
    | "topContributingFiles"
    | "complexityHotspots"
    | "none"
) {
  switch (source) {
    case "backend_fix_suggestions":
      return "Backend"
    case "recommendations_fixSuggestions":
      return "Recommendations"
    case "ml_fixSuggestions":
      return "ML fallback"
    case "nextActions_fallback":
      return "Next actions fallback"
    case "backend_top_files_to_fix":
      return "Backend"
    case "recommendations_topFilesToFix":
      return "Recommendations"
    case "ml_refactorPriority":
      return "ML fallback"
    case "topContributingFiles":
      return "Top files fallback"
    case "complexityHotspots":
      return "Complexity fallback"
    default:
      return "Unavailable"
  }
}

function uniqueNonEmpty(items: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      items
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  )
}

function toDisplayNumber(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—"
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function riskAccentFromLevel(
  level?: string | null
): "neutral" | "success" | "warning" | "danger" | "info" {
  const normalized = String(level ?? "").toLowerCase()

  if (["low", "healthy", "good", "stable", "a", "b"].includes(normalized)) {
    return "success"
  }

  if (["medium", "moderate", "warning", "c"].includes(normalized)) {
    return "warning"
  }

  if (["high", "critical", "failed", "d", "e", "f"].includes(normalized)) {
    return "danger"
  }

  if (["info", "running", "queued"].includes(normalized)) {
    return "info"
  }

  return "neutral"
}

function buildInsightItems(
  items: Array<{
    id: string
    title: string
    description?: string
    meta?: string[]
    badge?: string
  }>
) {
  return items
}

function shortLevel(level?: string | null) {
  if (!level) return "Unknown"
  return titleCase(level)
}

function buildQuickVerdict(params: {
  healthScore?: number
  grade?: string
  criticalAndHighCount: number
  architectureRiskLevel?: string | null
  predictedRiskLevel?: string | null
}) {
  const {
    healthScore,
    grade,
    criticalAndHighCount,
    architectureRiskLevel,
    predictedRiskLevel,
  } = params

  const health =
    typeof healthScore === "number"
      ? healthScore >= 80
        ? "strong"
        : healthScore >= 60
          ? "fair"
          : "fragile"
      : "mixed"

  const severityMessage =
    criticalAndHighCount > 0
      ? `${criticalAndHighCount} high-priority issue${
          criticalAndHighCount === 1 ? "" : "s"
        } need attention`
      : "no critical or high-severity findings were detected"

  const architectureMessage = architectureRiskLevel
    ? `architecture pressure is ${String(architectureRiskLevel).toLowerCase()}`
    : "architecture pressure is not prominent"

  const mlMessage = predictedRiskLevel
    ? `predicted risk is ${String(predictedRiskLevel).toLowerCase()}`
    : "predicted risk is unavailable"

  return `This repository currently looks ${health} overall with grade ${grade ?? "N/A"}. ${severityMessage}, ${architectureMessage}, and ${mlMessage}.`
}

function buildSimpleWhyItMatters(params: {
  topRiskItems: string[]
  recommendedActionItems: string[]
}) {
  const firstRisk = params.topRiskItems[0]
  const firstAction = params.recommendedActionItems[0]

  if (firstRisk && firstAction) {
    return `${firstRisk} Start by ${firstAction.charAt(0).toLowerCase()}${firstAction.slice(1)}`
  }

  if (firstRisk) return firstRisk
  if (firstAction) return `Recommended first action: ${firstAction}`
  return "This scan completed successfully, but no detailed plain-English explanation was generated."
}

export function ReportView({
  scanId,
  results,
  isPublic,
}: {
  scanId: string
  results: Results
  isPublic?: boolean
}) {

  const [showDeepDive, setShowDeepDive] = useState(false)
  const deepDiveRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (showDeepDive && deepDiveRef.current) {
      deepDiveRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }, [showDeepDive])

  const safeFindings = results.findings ?? []
  const normalizedFindings = normalizeFindingsForTable(safeFindings)
  const counts = severityCounts(safeFindings)
  const topFindings = normalizedFindings.slice(0, 6)
  const languages = normalizeLanguages(results)

  const {
    riskPrediction,
    technicalDebtPrediction,
    riskExplanation,
    technicalDebtExplanation,
    topContributingFiles,
    nextActions,
    summaryText,
  } = normalizeMl(results)

  const ai = normalizeAi(results)

  const {
    summary: architectureSummary,
    directoryHotspots,
    fileHotspots,
    possibleGodFiles,
    smells: architectureSmells,
    recommendations: architectureRecommendations,
    couplingHotspots,
    dependencyHubs,
    boundaryWarnings,
    directoryCouplingHotspots,
    hasArchitecture,
  } = normalizeArchitecture(results)

  const fixSuggestionsState = normalizeFixSuggestions(results)
  const refactorTargetsState = normalizeRefactorTargets(results, topContributingFiles)

  const hasMlInsights =
    !!riskPrediction ||
    !!technicalDebtPrediction ||
    !!summaryText ||
    topContributingFiles.length > 0 ||
    nextActions.length > 0 ||
    !!riskExplanation ||
    !!technicalDebtExplanation

  const hasAiInsights =
    !!ai.summary ||
    !!ai.riskExplanation ||
    !!ai.refactorPlan ||
    !!ai.grounding

  const totalFindings = safeFindings.length
  const criticalAndHighCount = counts.critical + counts.high

  const summaryBarItems = [
    {
      label: "Health",
      value: toDisplayNumber(results.healthScore),
      tone: riskAccentFromLevel(results.grade),
    },
    {
      label: "Grade",
      value: results.grade ?? "—",
      tone: riskAccentFromLevel(results.grade),
    },
    {
      label: "Findings",
      value: totalFindings,
      tone: totalFindings > 0 ? "warning" : "success",
    },
    {
      label: "Critical + High",
      value: criticalAndHighCount,
      tone: criticalAndHighCount > 0 ? "danger" : "success",
    },
    {
      label: "Architecture Risk",
      value: titleCase(architectureSummary.architectureRiskLevel),
      tone: riskAccentFromLevel(architectureSummary.architectureRiskLevel),
    },
    {
      label: "Predicted Risk",
      value: titleCase(riskPrediction?.level ?? ai.grounding?.predictedRiskLevel),
      tone: riskAccentFromLevel(riskPrediction?.level ?? ai.grounding?.predictedRiskLevel),
    },
  ] as const

  const metricItems = [
    {
      label: "Health Score",
      value: toDisplayNumber(results.healthScore),
      hint: "Overall codebase health score",
      accent: riskAccentFromLevel(results.grade),
      badge: results.grade ?? "—",
      badgeTone: riskAccentFromLevel(results.grade),
    },
    {
      label: "Quality",
      value: toDisplayNumber(results.subScores?.quality),
      hint: "Quality sub-score",
      accent: "info" as const,
    },
    {
      label: "Security",
      value: toDisplayNumber(results.subScores?.security),
      hint: "Security sub-score",
      accent: counts.critical > 0 || counts.high > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      label: "Maintainability",
      value: toDisplayNumber(results.subScores?.maintainability),
      hint: "Maintainability sub-score",
      accent: "neutral" as const,
    },
    {
      label: "Predicted Debt",
      value: titleCase(technicalDebtPrediction?.level ?? ai.grounding?.predictedDebtLevel),
      hint: `Score: ${toDisplayNumber(technicalDebtPrediction?.score)}`,
      accent: riskAccentFromLevel(
        technicalDebtPrediction?.level ?? ai.grounding?.predictedDebtLevel
      ),
    },
    {
      label: "Critical + High Findings",
      value: criticalAndHighCount,
      hint: `${counts.critical} critical • ${counts.high} high`,
      accent: criticalAndHighCount > 0 ? ("danger" as const) : ("success" as const),
    },
  ]

  const topRiskItems = uniqueNonEmpty([
    ...(ai.riskExplanation?.bullets ?? []),
    criticalAndHighCount > 0
      ? `${criticalAndHighCount} high-priority findings need attention first.`
      : "No critical or high-severity findings were detected.",
    architectureSummary.architectureRiskLevel
      ? `Architecture pressure is ${titleCase(architectureSummary.architectureRiskLevel)}.`
      : undefined,
    riskPrediction?.level
      ? `ML risk prediction is ${titleCase(riskPrediction.level)}.`
      : undefined,
    technicalDebtPrediction?.level
      ? `Technical debt prediction is ${titleCase(technicalDebtPrediction.level)}.`
      : undefined,
  ])

  const recommendedActionItems = uniqueNonEmpty([
    ...(ai.refactorPlan?.steps ?? []),
    ...fixSuggestionsState.items
      .slice(0, 3)
      .map((item) => item.recommendedAction ?? item.title),
    ...nextActions.slice(0, 3),
  ])

  const aiHighlights = uniqueNonEmpty([
    ai.riskExplanation?.narrative,
    riskExplanation?.narrative,
    technicalDebtExplanation?.narrative,
  ]).slice(0, 3)

    const quickVerdict = useMemo(
    () =>
      buildQuickVerdict({
        healthScore: results.healthScore,
        grade: results.grade,
        criticalAndHighCount,
        architectureRiskLevel: architectureSummary.architectureRiskLevel,
        predictedRiskLevel: riskPrediction?.level ?? ai.grounding?.predictedRiskLevel,
      }),
    [
      results.healthScore,
      results.grade,
      criticalAndHighCount,
      architectureSummary.architectureRiskLevel,
      riskPrediction?.level,
      ai.grounding?.predictedRiskLevel,
    ]
  )

  const simpleWhyItMatters = useMemo(
    () =>
      buildSimpleWhyItMatters({
        topRiskItems,
        recommendedActionItems,
      }),
    [topRiskItems, recommendedActionItems]
  )

  const topPriorityItems = recommendedActionItems.slice(0, 3)

  const architectureSummaryItems = [
    {
      label: "Architecture Risk",
      value: titleCase(architectureSummary.architectureRiskLevel),
      subtext: `Score ${formatScore(architectureSummary.architectureRiskScore)}`,
    },
    {
      label: "God Files",
      value: architectureSummary.possibleGodFiles ?? 0,
      subtext: "Possible overloaded files",
    },
    {
      label: "Coupling Hotspots",
      value: architectureSummary.couplingHotspots ?? 0,
      subtext: "Highly connected files",
    },
    {
      label: "Boundary Warnings",
      value: architectureSummary.boundaryWarnings ?? 0,
      subtext: "Cross-directory pressure",
    },
  ]

  const architectureSmellItems = buildInsightItems(
    architectureSmells.map((smell, index) => ({
      id: smell.id ?? `arch-smell-${index}`,
      title: smell.title ?? `Architecture smell #${index + 1}`,
      description: smell.message ?? "No description available.",
      badge: titleCase(smell.severity),
      meta: smell.recommendation ? [`Recommendation: ${smell.recommendation}`] : [],
    }))
  )

  const architectureRecommendationItems = buildInsightItems(
    architectureRecommendations.map((item, index) => ({
      id: `arch-reco-${index}`,
      title: item,
    }))
  )

  const directoryHotspotItems = buildInsightItems(
    directoryHotspots.map((item, index) => ({
      id: `${item.directoryPath}-${index}`,
      title: item.directoryPath || ".",
      description: `Score ${typeof item.score === "number" ? item.score.toFixed(0) : "N/A"}`,
      meta: [
        `Files: ${item.fileCount ?? 0}`,
        `LOC: ${item.loc ?? 0}`,
        `LOC share: ${item.locShare ?? 0}%`,
        `Issues: ${item.issueCount ?? 0}`,
        `Hotspots: ${item.hotspotCount ?? 0}`,
      ],
    }))
  )

  const possibleGodFileItems = buildInsightItems(
    possibleGodFiles.map((item, index) => ({
      id: `${item.filePath}-${index}`,
      title: item.filePath,
      badge: typeof item.score === "number" ? item.score.toFixed(0) : "N/A",
      meta: [
        `LOC: ${item.loc ?? 0}`,
        `Findings: ${item.findingCount ?? 0}`,
        `Hotspot: ${item.hotspotScore ?? 0}`,
        ...(item.reasons ?? []),
      ],
    }))
  )

  const fileHotspotItems = buildInsightItems(
    fileHotspots.map((item, index) => ({
      id: `${item.filePath}-${index}`,
      title: item.filePath,
      badge: typeof item.score === "number" ? item.score.toFixed(0) : "N/A",
      meta: [
        `LOC: ${item.loc ?? 0}`,
        `Findings: ${item.findingCount ?? 0}`,
        `Hotspot: ${item.hotspotScore ?? 0}`,
        ...(item.reasons ?? []),
      ],
    }))
  )

  const couplingHotspotItems = buildInsightItems(
    couplingHotspots.map((item, index) => ({
      id: `${item.filePath}-${index}`,
      title: item.filePath,
      badge: typeof item.score === "number" ? item.score.toFixed(0) : "N/A",
      meta: [
        `Internal imports: ${item.internalImportCount ?? 0}`,
        `Inbound deps: ${item.internalInboundCount ?? 0}`,
        ...(item.reasons ?? []),
      ],
    }))
  )

  const dependencyHubItems = buildInsightItems(
    dependencyHubs.map((item, index) => ({
      id: `${item.filePath}-${index}`,
      title: item.filePath,
      badge: typeof item.score === "number" ? item.score.toFixed(0) : "N/A",
      meta: [
        `Inbound dependencies: ${item.inboundDependencyCount ?? 0}`,
        ...(item.reasons ?? []),
      ],
    }))
  )

  const boundaryWarningItems = buildInsightItems(
    boundaryWarnings.map((item, index) => ({
      id: `${item.sourceDirectory}-${item.targetDirectory}-${index}`,
      title: `${item.sourceDirectory} → ${item.targetDirectory}`,
      description: item.message ?? "No boundary warning description available.",
      badge: titleCase(item.severity),
      meta: [`Cross imports: ${item.crossImportCount ?? 0}`],
    }))
  )

  const directoryCouplingItems = buildInsightItems(
    directoryCouplingHotspots.map((item, index) => ({
      id: `${item.directoryPath}-${index}`,
      title: item.directoryPath,
      badge: typeof item.score === "number" ? item.score.toFixed(0) : "N/A",
      meta: [
        `Cross imports: ${item.crossImportCount ?? 0}`,
        `Target dirs: ${item.uniqueTargetDirectories ?? 0}`,
      ],
    }))
  )

  const mlTopContributingItems = buildInsightItems(
    topContributingFiles.map((file, index) => ({
      id: `${file.filePath}-${index}`,
      title: file.filePath,
      badge:
        typeof (file.priorityScore ?? file.contributionScore) === "number"
          ? Number(file.priorityScore ?? file.contributionScore).toFixed(0)
          : "N/A",
      meta: [
        `Effort: ${file.estimatedEffort ?? "N/A"}`,
        `Action: ${file.recommendedAction ?? "No action suggested."}`,
        ...(file.reasons ?? []),
      ],
    }))
  )

  const nextActionItems = buildInsightItems(
    nextActions.map((action, index) => ({
      id: `next-action-${index}`,
      title: action,
    }))
  )

  const fixSuggestionItems = buildInsightItems(
    fixSuggestionsState.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.why,
      badge: item.priority ? titleCase(item.priority) : undefined,
      meta: [
        ...(item.filePath ? [item.filePath] : []),
        ...(item.recommendedAction ? [`Action: ${item.recommendedAction}`] : []),
        ...(item.saferAlternative ? [`Safer alternative: ${item.saferAlternative}`] : []),
      ],
    }))
  )

  const refactorTargetItems = buildInsightItems(
    refactorTargetsState.items.slice(0, 5).map((item, index) => ({
      id: item.id,
      title: `#${index + 1} ${item.filePath}`,
      badge: typeof item.score === "number" ? item.score.toFixed(0) : "N/A",
      meta: [
        ...(item.estimatedEffort ? [`Effort: ${item.estimatedEffort}`] : []),
        ...(item.recommendedAction ? [`Action: ${item.recommendedAction}`] : []),
        ...item.reasons,
      ],
    }))
  )

  const groundingPairs = [
    { label: "Health score", value: ai.grounding?.healthScore ?? "—" },
    { label: "Grade", value: ai.grounding?.grade ?? "—" },
    { label: "Total findings", value: ai.grounding?.totalFindings ?? "—" },
    { label: "Critical findings", value: ai.grounding?.criticalCount ?? "—" },
    { label: "High findings", value: ai.grounding?.highCount ?? "—" },
    { label: "Coupling hotspots", value: ai.grounding?.couplingHotspots ?? "—" },
    { label: "Dependency hubs", value: ai.grounding?.dependencyHubs ?? "—" },
    {
      label: "Architecture risk",
      value: titleCase(ai.grounding?.architectureRiskLevel),
    },
    {
      label: "Predicted risk",
      value: titleCase(ai.grounding?.predictedRiskLevel),
    },
  ]

  async function copyShare() {
    const url = `${window.location.origin}/report/public/${scanId}`
    await navigator.clipboard.writeText(url)
    toast({ title: "Share link copied" })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardHeader
        title={isPublic ? "Public Scan Report" : "Scan Report"}
        description="Review code health, findings, architecture pressure, ML signals, and grounded AI recommendations in one place."
        scanId={scanId}
        isPublic={isPublic}
        onShare={!isPublic ? copyShare : undefined}
      />

      <ScanSummaryBar items={[...summaryBarItems]} />

      <div className="space-y-4">
        <SectionHeader
          title="Executive Overview"
          description="A premium top-level summary of the most important signals from this scan."
        />
        <MetricsGrid items={metricItems} />
      </div>

            <div className="space-y-4">
        <SectionHeader
          title="Simple Summary"
          description="A simpler first-pass explanation of what matters most in this scan."
        />

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="rounded-[28px] border-white/10 bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(255,255,255,0.02))]">
            <CardContent className="space-y-5 p-6 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-zinc-200">Quick Verdict</div>
                  <div className="text-sm text-zinc-400">
                    Start here for the simplest plain-English summary.
                  </div>
                </div>

                <StatusPill
                  label={shortLevel(ai.riskExplanation?.level ?? riskPrediction?.level ?? results.grade)}
                  tone={riskAccentFromLevel(
                    ai.riskExplanation?.level ?? riskPrediction?.level ?? results.grade
                  )}
                />
              </div>

              <p className="text-sm leading-7 text-zinc-200 md:text-[15px]">
                {quickVerdict}
              </p>

              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                  Why this matters
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {simpleWhyItMatters}
                </p>
              </div>

              {ai.summary ? (
                <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                    AI short summary
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {ai.summary}
                  </p>
                </div>
              ) : null}

            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-white">Do this next</div>
                <div className="text-sm text-zinc-400">
                  Top priority actions from this scan.
                </div>
              </div>

              {topPriorityItems.length ? (
                <div className="space-y-3">
                  {topPriorityItems.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-xs font-semibold text-emerald-300">
                        {index + 1}
                      </div>
                      <div className="text-sm text-zinc-300">{item}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-500">
                  No immediate recommended actions were generated for this scan.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <TopRisksCard
            title="Top Risks"
            items={topRiskItems.slice(0, 3)}
            level={ai.riskExplanation?.level ?? riskPrediction?.level}
          />

          <RecommendedActionsCard
            title="Recommended Actions"
            items={recommendedActionItems.slice(0, 3)}
          />
        </div>
      </div>


      <Separator />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-2 md:grid-cols-4 xl:grid-cols-7">
          <TabsTrigger
            value="overview"
            className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-black"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="quality"
            className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-black"
          >
            Quality
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-black"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="complexity"
            className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-black"
          >
            Complexity
          </TabsTrigger>
          <TabsTrigger
            value="architecture"
            className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-black"
          >
            Architecture
          </TabsTrigger>
          <TabsTrigger
            value="fixes"
            className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-black"
          >
            Fixes
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-black"
          >
            AI Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <TabSectionShell
            title="Overview"
            description="Quick visual summaries and top findings from this scan."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle className="text-white">Findings by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <SeverityChart counts={counts as any} />
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle className="text-white">Languages</CardTitle>
                </CardHeader>
                <CardContent>
                  <LanguageChart languages={languages} />
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-white">Top Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <FindingsTable findings={topFindings} />
              </CardContent>
            </Card>
          </TabSectionShell>
        </TabsContent>

        <TabsContent value="quality" className="mt-6">
          <TabSectionShell
            title="Quality Findings"
            description="Code quality issues detected during analysis."
          >
            <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
              <CardContent className="p-6">
                <FindingsTable
                  findings={normalizedFindings.filter((f) => f.type === "quality")}
                />
              </CardContent>
            </Card>
          </TabSectionShell>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <TabSectionShell
            title="Security Findings"
            description="Security issues and related alerts from the scan."
          >
            <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
              <CardContent className="p-6">
                <FindingsTable
                  findings={normalizedFindings.filter((f) => f.type === "security")}
                />
              </CardContent>
            </Card>
          </TabSectionShell>
        </TabsContent>

        <TabsContent value="complexity" className="mt-6">
          <TabSectionShell
            title="Complexity Analysis"
            description="Cyclomatic complexity hotspots and findings."
          >
            {(results.metrics?.complexityHotspots ?? []).length ? (
              <InsightListCard
                title="Complexity Hotspots"
                description="Files with elevated complexity scores."
                items={buildInsightItems(
                  (results.metrics?.complexityHotspots ?? []).map((h: any, i: number) => ({
                    id: `${h.filePath}-${h.score}-${i}`,
                    title: h.filePath,
                    badge: String(h.score),
                  }))
                )}
              />
            ) : (
              <EmptyStateCard
                title="No complexity hotspots"
                description="No elevated complexity hotspots were detected in this scan."
              />
            )}

            <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-white">Complexity Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <FindingsTable
                  findings={normalizedFindings.filter((f) => f.type === "complexity")}
                />
              </CardContent>
            </Card>
          </TabSectionShell>
        </TabsContent>

        <TabsContent value="architecture" className="mt-6">
          <TabSectionShell
            title="Architecture Explorer"
            description="Detailed architecture hotspots, coupling pressure, and boundaries."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {directoryHotspotItems.length ? (
                <InsightListCard
                  title="Directory Hotspots"
                  description="Directories with concentrated code weight and issues."
                  items={directoryHotspotItems}
                />
              ) : (
                <EmptyStateCard
                  title="No directory hotspots"
                  description="No directory hotspot data is available for this scan."
                />
              )}

              {possibleGodFileItems.length ? (
                <InsightListCard
                  title="Possible God Files"
                  description="Files that may be carrying too much responsibility."
                  items={possibleGodFileItems}
                />
              ) : (
                <EmptyStateCard
                  title="No god files detected"
                  description="No possible god files were flagged in this scan."
                />
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {fileHotspotItems.length ? (
                <InsightListCard
                  title="File Hotspots"
                  description="Files with elevated hotspot scores."
                  items={fileHotspotItems}
                />
              ) : (
                <EmptyStateCard
                  title="No file hotspots"
                  description="No file hotspot data is available for this scan."
                />
              )}

              {couplingHotspotItems.length ? (
                <InsightListCard
                  title="Coupling Hotspots"
                  description="Files with elevated internal dependency coupling."
                  items={couplingHotspotItems}
                />
              ) : (
                <EmptyStateCard
                  title="No coupling hotspots"
                  description="No coupling hotspot data is available for this scan."
                />
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {dependencyHubItems.length ? (
                <InsightListCard
                  title="Dependency Hubs"
                  description="Files that attract a large number of inbound dependencies."
                  items={dependencyHubItems}
                />
              ) : (
                <EmptyStateCard
                  title="No dependency hubs"
                  description="No dependency hub data is available for this scan."
                />
              )}

              {boundaryWarningItems.length ? (
                <InsightListCard
                  title="Boundary Warnings"
                  description="Cross-directory boundaries that may need attention."
                  items={boundaryWarningItems}
                />
              ) : (
                <EmptyStateCard
                  title="No boundary warnings"
                  description="No boundary warnings were detected."
                />
              )}
            </div>

            {directoryCouplingItems.length ? (
              <InsightListCard
                title="Directory Coupling Hotspots"
                description="Directories with elevated cross-import pressure."
                items={directoryCouplingItems}
              />
            ) : (
              <EmptyStateCard
                title="No directory coupling hotspots"
                description="No directory coupling hotspots were detected."
              />
            )}
          </TabSectionShell>
        </TabsContent>

        <TabsContent value="fixes" className="mt-6">
          <TabSectionShell
            title="Fixes and Refactor Priorities"
            description="Recommended remediations and highest-priority refactor targets."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {fixSuggestionItems.length ? (
                <InsightListCard
                  title="Suggested Quick Wins"
                  description={`Source: ${sourceLabel(fixSuggestionsState.source)}`}
                  items={fixSuggestionItems}
                />
              ) : (
                <EmptyStateCard
                  title="No quick wins available"
                  description="Backend fix suggestions were not available for this scan."
                />
              )}

              {refactorTargetItems.length ? (
                <InsightListCard
                  title="Top Refactor Targets"
                  description={`Source: ${sourceLabel(refactorTargetsState.source)}`}
                  items={refactorTargetItems}
                />
              ) : (
                <EmptyStateCard
                  title="No refactor targets available"
                  description="Backend refactor targets were not available for this scan."
                />
              )}
            </div>
          </TabSectionShell>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <TabSectionShell
            title="AI Chat"
            description="Ask questions about this scan, findings, and generated recommendations."
          >
            <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
              <CardContent className="p-4 md:p-6">
                <ScanChat scanId={scanId} />
              </CardContent>
            </Card>
          </TabSectionShell>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowDeepDive((prev) => !prev)}
          className="rounded-[18px] px-6"
        >
          {showDeepDive ? "Hide Deep Dive" : "Open Deep Dive"}
        </Button>
      </div>

      {showDeepDive && hasAiInsights && (
        <>
          <Separator />

          <div className="space-y-4">
            <SectionHeader
              title="ML Supporting Detail"
              description="Supporting ML-driven files and next actions."
            />

            <div className="grid gap-4 xl:grid-cols-2">
              {mlTopContributingItems.length ? (
                <InsightListCard
                  title="Top Contributing Files"
                  description="Files contributing most strongly to the ML assessment."
                  items={mlTopContributingItems}
                />
              ) : (
                <EmptyStateCard
                  title="No contributing file insights"
                  description="No ML contributing file details are available for this scan."
                />
              )}

              {nextActionItems.length ? (
                <InsightListCard
                  title="Next Actions"
                  description="Follow-up actions suggested by the ML and backend layers."
                  items={nextActionItems}
                />
              ) : (
                <EmptyStateCard
                  title="No next actions"
                  description="No next actions were generated for this scan."
                />
              )}
            </div>
          </div>
        </>
      )}

      {showDeepDive && hasArchitecture && (
        <>
          <Separator />

          <div className="space-y-4">
            <SectionHeader
              title="Architecture Insights"
              description="Structural signals based on file size, hotspot concentration, clustered findings, and module coupling pressure."
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {architectureSummaryItems.map((item) => (
                <StatHighlightCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  subtext={item.subtext}
                />
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <InsightListCard
                title="Architecture Smells"
                description="Design and structure issues detected in the current scan."
                items={architectureSmellItems}
                emptyText="No architecture smells detected for this scan."
              />

              <InsightListCard
                title="Architecture Recommendations"
                description="Suggested improvements to reduce structural pressure."
                items={architectureRecommendationItems}
                emptyText="No architecture recommendations available."
              />
            </div>
          </div>
        </>
      )}

      {showDeepDive && hasMlInsights && (
        <>
          <Separator />

          <div className="space-y-4">
            <SectionHeader
              title="ML Insights"
              description="ML-assisted predictions and explanations generated from scan signals."
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatHighlightCard
                label="Predicted Risk"
                value={riskPrediction?.level ?? "—"}
                subtext={`Score: ${formatScore(riskPrediction?.score)}`}
              />
              <StatHighlightCard
                label="Predicted Debt"
                value={technicalDebtPrediction?.level ?? "—"}
                subtext={`Score: ${formatScore(technicalDebtPrediction?.score)}`}
              />
              <Card className="rounded-[22px] border-white/10 bg-white/[0.03] sm:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">ML Summary</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-zinc-400">
                  {summaryText ?? "No ML summary available for this scan."}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <InsightListCard
                title={riskExplanation?.title ?? "Risk Explanation"}
                description={riskExplanation?.narrative ?? "No risk explanation available."}
                items={buildInsightItems([
                  ...(riskExplanation?.reasons ?? []).map((reason, index) => ({
                    id: `risk-reason-${index}`,
                    title: reason,
                    badge: "Reason",
                  })),
                  ...(riskExplanation?.drivers ?? []).map((driver, index) => ({
                    id: `risk-driver-${index}`,
                    title: driver,
                    badge: "Driver",
                  })),
                ])}
                emptyText="No detailed ML risk factors available."
              />

              <InsightListCard
                title={technicalDebtExplanation?.title ?? "Technical Debt Explanation"}
                description={
                  technicalDebtExplanation?.narrative ??
                  "No technical debt explanation available."
                }
                items={buildInsightItems([
                  ...(technicalDebtExplanation?.reasons ?? []).map((reason, index) => ({
                    id: `debt-reason-${index}`,
                    title: reason,
                    badge: "Reason",
                  })),
                  ...(technicalDebtExplanation?.drivers ?? []).map((driver, index) => ({
                    id: `debt-driver-${index}`,
                    title: driver,
                    badge: "Driver",
                  })),
                ])}
                emptyText="No detailed technical debt factors available."
              />
            </div>
          </div>
        </>
      )}


      {showDeepDive && hasAiInsights && (
        <div ref={deepDiveRef} className="space-y-6">
          <Separator />

          <div className="space-y-4">
            <SectionHeader
              title="Grounded AI Details"
              description="Detailed grounded insight blocks generated by the backend."
            />

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle>AI Risk Level</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-semibold text-white">
                    {titleCase(ai.riskExplanation?.level)}
                  </div>
                  <StatusPill
                    label={titleCase(ai.riskExplanation?.level)}
                    tone={riskAccentFromLevel(ai.riskExplanation?.level)}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle>Architecture Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-semibold text-white">
                    {titleCase(ai.grounding?.architectureRiskLevel)}
                  </div>
                  <StatusPill
                    label={titleCase(ai.grounding?.architectureRiskLevel)}
                    tone={riskAccentFromLevel(ai.grounding?.architectureRiskLevel)}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle>Predicted Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-semibold text-white">
                    {titleCase(ai.grounding?.predictedRiskLevel)}
                  </div>
                  <StatusPill
                    label={titleCase(ai.grounding?.predictedRiskLevel)}
                    tone={riskAccentFromLevel(ai.grounding?.predictedRiskLevel)}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle>Predicted Debt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-semibold text-white">
                    {titleCase(ai.grounding?.predictedDebtLevel)}
                  </div>
                  <StatusPill
                    label={titleCase(ai.grounding?.predictedDebtLevel)}
                    tone={riskAccentFromLevel(ai.grounding?.predictedDebtLevel)}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle>{ai.riskExplanation?.title ?? "Risk Explanation"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-6 text-zinc-300">
                    {ai.riskExplanation?.narrative ?? "No grounded risk explanation available."}
                  </p>

                  {!!ai.riskExplanation?.bullets?.length && (
                    <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-400">
                      {ai.riskExplanation.bullets.map((bullet, index) => (
                        <li key={`${bullet}-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle>{ai.refactorPlan?.title ?? "Refactor Plan"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!!ai.refactorPlan?.steps?.length ? (
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-400">
                      {ai.refactorPlan.steps.map((step, index) => (
                        <li key={`${step}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-zinc-400">No grounded refactor plan available.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Grounding Data</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoPairGrid items={groundingPairs} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

    </div>
  )
}