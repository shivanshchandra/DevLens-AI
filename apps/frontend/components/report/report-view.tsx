"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

import { SeverityChart } from "@/components/dashboard/severity-chart"
import { LanguageChart } from "@/components/dashboard/language-chart"
import { FindingsTable } from "@/components/dashboard/findings-table"
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
        recommendedAction: "Dedicated backend refactor targets were not present, so this fallback uses complexity hotspots.",
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

export function ReportView({
  scanId,
  results,
  isPublic,
}: {
  scanId: string
  results: Results
  isPublic?: boolean
}) {
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

  async function copyShare() {
    const url = `${window.location.origin}/report/public/${scanId}`
    await navigator.clipboard.writeText(url)
    toast({ title: "Share link copied" })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isPublic ? "Public Report" : "Report"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Health score summarizes quality, security, maintainability, and AI-derived risk signals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">Scan {scanId.slice(0, 8)}</Badge>
          {!isPublic && (
            <Button variant="outline" onClick={copyShare}>
              Share
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">{results.healthScore}</div>
            <div className="text-sm text-muted-foreground">Grade: {results.grade}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{results.subScores.quality}</div>
            <div className="text-sm text-muted-foreground">Sub-score</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{results.subScores.security}</div>
            <div className="text-sm text-muted-foreground">Sub-score</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintainability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{results.subScores.maintainability}</div>
            <div className="text-sm text-muted-foreground">Sub-score</div>
          </CardContent>
        </Card>
      </div>

      {hasAiInsights && (
        <>
          <Separator />

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Grounded AI Insights</h2>
              <p className="text-sm text-muted-foreground">
                Backend-generated narrative insights grounded in findings, architecture signals, refactor targets, and ML outputs.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Risk Level</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {titleCase(ai.riskExplanation?.level)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Combined signal assessment
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Architecture Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {titleCase(ai.grounding?.architectureRiskLevel)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Structural pressure
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Predicted Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {titleCase(ai.grounding?.predictedRiskLevel)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ML risk signal
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Predicted Debt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {titleCase(ai.grounding?.predictedDebtLevel)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ML debt signal
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {ai.summary ?? "No grounded AI summary available for this scan."}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{ai.riskExplanation?.title ?? "Risk Explanation"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {ai.riskExplanation?.narrative ?? "No grounded risk explanation available."}
                  </p>

                  {!!ai.riskExplanation?.bullets?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Signals</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {ai.riskExplanation.bullets.map((bullet, index) => (
                          <li key={`${bullet}-${index}`}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{ai.refactorPlan?.title ?? "Refactor Plan"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!!ai.refactorPlan?.steps?.length ? (
                    <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-2">
                      {ai.refactorPlan.steps.map((step, index) => (
                        <li key={`${step}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No grounded refactor plan available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Grounding Data</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
                <div>Health score: {ai.grounding?.healthScore ?? "—"}</div>
                <div>Grade: {ai.grounding?.grade ?? "—"}</div>
                <div>Total findings: {ai.grounding?.totalFindings ?? "—"}</div>
                <div>Critical findings: {ai.grounding?.criticalCount ?? "—"}</div>
                <div>High findings: {ai.grounding?.highCount ?? "—"}</div>
                <div>Coupling hotspots: {ai.grounding?.couplingHotspots ?? "—"}</div>
                <div>Dependency hubs: {ai.grounding?.dependencyHubs ?? "—"}</div>
                <div>Architecture risk: {titleCase(ai.grounding?.architectureRiskLevel)}</div>
                <div>Predicted risk: {titleCase(ai.grounding?.predictedRiskLevel)}</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {hasArchitecture && (
        <>
          <Separator />

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Architecture Insights</h2>
              <p className="text-sm text-muted-foreground">
                Structural signals based on file size, hotspot concentration, clustered findings, and module coupling pressure.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Architecture Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {titleCase(architectureSummary.architectureRiskLevel)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Score: {formatScore(architectureSummary.architectureRiskScore)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>God Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">
                    {architectureSummary.possibleGodFiles ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Possible overloaded files</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Coupling Hotspots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">
                    {architectureSummary.couplingHotspots ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Highly connected files</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Boundary Warnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">
                    {architectureSummary.boundaryWarnings ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Cross-directory pressure</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Architecture smells</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {architectureSmells.length ? (
                    architectureSmells.map((smell, index) => (
                      <div key={smell.id ?? `arch-smell-${index}`} className="rounded-md border px-3 py-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-medium">
                            {smell.title ?? `Architecture smell #${index + 1}`}
                          </div>
                          <Badge variant="outline">{titleCase(smell.severity)}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {smell.message ?? "No description available."}
                        </div>
                        {smell.recommendation && (
                          <div className="text-sm text-muted-foreground">
                            Recommendation: {smell.recommendation}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No architecture smells detected for this scan.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Architecture recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {architectureRecommendations.length ? (
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {architectureRecommendations.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No architecture recommendations available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {hasMlInsights && (
        <>
          <Separator />

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">ML Insights</h2>
              <p className="text-sm text-muted-foreground">
                ML-assisted predictions and explanations generated from scan signals.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Predicted Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {riskPrediction?.level ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Score: {formatScore(riskPrediction?.score)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Predicted Debt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {technicalDebtPrediction?.level ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Score: {formatScore(technicalDebtPrediction?.score)}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>ML Summary</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {summaryText ?? "No ML summary available for this scan."}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{riskExplanation?.title ?? "Risk Explanation"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {riskExplanation?.narrative ?? "No risk explanation available."}
                  </p>

                  {!!riskExplanation?.reasons?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Reasons</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {riskExplanation.reasons.map((reason, index) => (
                          <li key={`${reason}-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!riskExplanation?.drivers?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Drivers</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {riskExplanation.drivers.map((driver, index) => (
                          <li key={`${driver}-${index}`}>{driver}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {technicalDebtExplanation?.title ?? "Technical Debt Explanation"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {technicalDebtExplanation?.narrative ??
                      "No technical debt explanation available."}
                  </p>

                  {!!technicalDebtExplanation?.reasons?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Reasons</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {technicalDebtExplanation.reasons.map((reason, index) => (
                          <li key={`${reason}-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!technicalDebtExplanation?.drivers?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Drivers</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {technicalDebtExplanation.drivers.map((driver, index) => (
                          <li key={`${driver}-${index}`}>{driver}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Contributing Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topContributingFiles.length ? (
                    topContributingFiles.map((file, index) => (
                      <div
                        key={`${file.filePath}-${index}`}
                        className="space-y-2 rounded-md border px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-mono text-xs break-all">{file.filePath}</div>
                          <Badge variant="outline">
                            {typeof (file.priorityScore ?? file.contributionScore) === "number"
                              ? Number(file.priorityScore ?? file.contributionScore).toFixed(0)
                              : "N/A"}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Effort: {file.estimatedEffort ?? "N/A"}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Action: {file.recommendedAction ?? "No action suggested."}
                        </div>

                        {!!file.reasons?.length && (
                          <ul className="list-disc pl-5 text-sm text-muted-foreground">
                            {file.reasons.map((reason, reasonIndex) => (
                              <li key={`${file.filePath}-reason-${reasonIndex}`}>{reason}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No contributing file insights available.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {nextActions.length ? (
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {nextActions.map((action, index) => (
                        <li key={`${action}-${index}`}>{action}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No next actions generated for this scan.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <Separator />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="complexity">Complexity</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="fixes">Fixes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Findings by severity</CardTitle>
              </CardHeader>
              <CardContent>
                <SeverityChart counts={counts as any} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <LanguageChart languages={languages} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable findings={topFindings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable
                findings={normalizedFindings.filter((f) => f.type === "quality")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable
                findings={normalizedFindings.filter((f) => f.type === "security")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complexity" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complexity hotspots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(results.metrics?.complexityHotspots ?? []).map((h: any, i: number) => (
                <div
                  key={`${h.filePath}-${h.score}-${i}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="font-mono text-xs">{h.filePath}</div>
                  <div className="text-sm font-semibold">{h.score}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complexity findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable
                findings={normalizedFindings.filter((f) => f.type === "complexity")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architecture" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Directory hotspots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {directoryHotspots.length ? (
                directoryHotspots.map((item, index) => (
                  <div
                    key={`${item.directoryPath}-${index}`}
                    className="rounded-md border px-3 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-xs break-all">
                        {item.directoryPath || "."}
                      </div>
                      <div className="text-sm font-semibold">
                        {typeof item.score === "number" ? item.score.toFixed(0) : "N/A"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>Files: {item.fileCount ?? 0}</span>
                      <span>LOC: {item.loc ?? 0}</span>
                      <span>LOC share: {item.locShare ?? 0}%</span>
                      <span>Issues: {item.issueCount ?? 0}</span>
                      <span>Hotspots: {item.hotspotCount ?? 0}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No directory hotspot data available.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Possible god files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {possibleGodFiles.length ? (
                  possibleGodFiles.map((item, index) => (
                    <div key={`${item.filePath}-${index}`} className="rounded-md border px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-xs break-all">{item.filePath}</div>
                        <Badge variant="outline">
                          {typeof item.score === "number" ? item.score.toFixed(0) : "N/A"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>LOC: {item.loc ?? 0}</span>
                        <span>Findings: {item.findingCount ?? 0}</span>
                        <span>Hotspot: {item.hotspotScore ?? 0}</span>
                      </div>

                      {!!item.reasons?.length && (
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          {item.reasons.map((reason, reasonIndex) => (
                            <li key={`${item.filePath}-reason-${reasonIndex}`}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No possible god files detected.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File hotspots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fileHotspots.length ? (
                  fileHotspots.map((item, index) => (
                    <div key={`${item.filePath}-${index}`} className="rounded-md border px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-xs break-all">{item.filePath}</div>
                        <Badge variant="outline">
                          {typeof item.score === "number" ? item.score.toFixed(0) : "N/A"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>LOC: {item.loc ?? 0}</span>
                        <span>Findings: {item.findingCount ?? 0}</span>
                        <span>Hotspot: {item.hotspotScore ?? 0}</span>
                      </div>

                      {!!item.reasons?.length && (
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          {item.reasons.map((reason, reasonIndex) => (
                            <li key={`${item.filePath}-reason-${reasonIndex}`}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No file hotspot data available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Coupling hotspots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {couplingHotspots.length ? (
                  couplingHotspots.map((item, index) => (
                    <div key={`${item.filePath}-${index}`} className="rounded-md border px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-xs break-all">{item.filePath}</div>
                        <Badge variant="outline">
                          {typeof item.score === "number" ? item.score.toFixed(0) : "N/A"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>Internal imports: {item.internalImportCount ?? 0}</span>
                        <span>Inbound deps: {item.internalInboundCount ?? 0}</span>
                      </div>

                      {!!item.reasons?.length && (
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          {item.reasons.map((reason, reasonIndex) => (
                            <li key={`${item.filePath}-reason-${reasonIndex}`}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No coupling hotspot data available.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dependency hubs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dependencyHubs.length ? (
                  dependencyHubs.map((item, index) => (
                    <div key={`${item.filePath}-${index}`} className="rounded-md border px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-xs break-all">{item.filePath}</div>
                        <Badge variant="outline">
                          {typeof item.score === "number" ? item.score.toFixed(0) : "N/A"}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Inbound dependencies: {item.inboundDependencyCount ?? 0}
                      </div>

                      {!!item.reasons?.length && (
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          {item.reasons.map((reason, reasonIndex) => (
                            <li key={`${item.filePath}-reason-${reasonIndex}`}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No dependency hub data available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Boundary warnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {boundaryWarnings.length ? (
                  boundaryWarnings.map((item, index) => (
                    <div key={`${item.sourceDirectory}-${item.targetDirectory}-${index}`} className="rounded-md border px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">
                          {item.sourceDirectory} → {item.targetDirectory}
                        </div>
                        <Badge variant="outline">{titleCase(item.severity)}</Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Cross imports: {item.crossImportCount ?? 0}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {item.message ?? "No boundary warning description available."}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No boundary warnings detected.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Directory coupling hotspots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {directoryCouplingHotspots.length ? (
                  directoryCouplingHotspots.map((item, index) => (
                    <div key={`${item.directoryPath}-${index}`} className="rounded-md border px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-xs break-all">{item.directoryPath}</div>
                        <Badge variant="outline">
                          {typeof item.score === "number" ? item.score.toFixed(0) : "N/A"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>Cross imports: {item.crossImportCount ?? 0}</span>
                        <span>Target dirs: {item.uniqueTargetDirectories ?? 0}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No directory coupling hotspots detected.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fixes" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Suggested quick wins</CardTitle>
              <Badge variant="outline">{sourceLabel(fixSuggestionsState.source)}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {fixSuggestionsState.items.length ? (
                fixSuggestionsState.items.map((item) => (
                  <div key={item.id} className="rounded-md border px-3 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.why}</div>
                      </div>

                      {item.priority && (
                        <Badge variant="outline">{titleCase(item.priority)}</Badge>
                      )}
                    </div>

                    {item.filePath && (
                      <div className="font-mono text-xs text-muted-foreground break-all">
                        {item.filePath}
                      </div>
                    )}

                    {item.recommendedAction && (
                      <div className="text-sm text-muted-foreground">
                        Action: {item.recommendedAction}
                      </div>
                    )}

                    {item.saferAlternative && (
                      <div className="text-sm text-muted-foreground">
                        Safer alternative: {item.saferAlternative}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Backend fix suggestions are not available for this scan. Fallback also failed.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Top refactor targets</CardTitle>
              <Badge variant="outline">{sourceLabel(refactorTargetsState.source)}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {refactorTargetsState.items.length ? (
                refactorTargetsState.items.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-md border px-3 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div className="font-mono text-xs break-all">{item.filePath}</div>
                      </div>
                      <div className="text-sm font-semibold">
                        {typeof item.score === "number" ? item.score.toFixed(0) : "N/A"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {item.estimatedEffort && <span>Effort: {item.estimatedEffort}</span>}
                      {item.recommendedAction && <span>Action: {item.recommendedAction}</span>}
                    </div>

                    {!!item.reasons.length && (
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {item.reasons.map((reason, reasonIndex) => (
                          <li key={`${item.id}-reason-${reasonIndex}`}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Backend refactor targets are not available for this scan. Fallback also failed.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}