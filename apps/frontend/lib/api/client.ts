export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"

type CreateScanBody = {
  source_type: "github" | "zip" | "pr"
  repo_url?: string | null
  pr_number?: number | null
  ref?: string | null
}

export type ScanRecord = {
  id: string
  source_type: "github" | "zip" | "pr"
  repo_url: string | null
  pr_number: number | null
  ref?: string | null
  status: "queued" | "running" | "completed" | "failed"

  progress: number
  current_step: string
  status_message: string | null

  error_message: string | null
  created_at: string
  updated_at: string
}

export type FindingType =
  | "security"
  | "quality"
  | "complexity"
  | "dependency"
  | "risk"

export type FindingSeverity = "low" | "medium" | "high" | "critical"

export type Finding = {
  id?: string
  type: FindingType
  title: string
  ruleId?: string
  message?: string
  filePath?: string
  severity: FindingSeverity
}

export type ComplexityHotspot = {
  filePath: string
  score: number
}

export type LanguageMetric = {
  name: string
  percent: number
}

export type ExplanationBlock = {
  title?: string
  narrative?: string
  reasons?: string[]
  drivers?: string[]
}

export type TopContributingFile = {
  filePath: string
  contributionScore?: number
  priorityScore?: number
  estimatedEffort?: string
  recommendedAction?: string
  reasons?: string[]
}

export type FixSuggestion = {
  findingId?: string
  filePath?: string
  title?: string
  priority?: string
  why?: string
  recommendedAction?: string
  saferAlternative?: string | null

  id?: string
  description?: string
  summary?: string
  severity?: string
  category?: string
  estimatedEffort?: string
  action?: string
}

export type RefactorPriorityItem = {
  filePath: string
  priorityScore?: number
  contributionScore?: number
  estimatedEffort?: string
  reasons?: string[]
  recommendedAction?: string

  id?: string
  reason?: string
  title?: string
}

export type MlInsights = {
  version?: string
  featureVector?: Record<string, number | string | boolean | null>
  riskPrediction?: {
    score?: number
    level?: string
  }
  technicalDebtPrediction?: {
    score?: number
    level?: string
  }
  explanations?: {
    risk?: ExplanationBlock
    technicalDebt?: ExplanationBlock
    topContributingFiles?: TopContributingFile[]
    nextActions?: string[]
  }
  topContributingFiles?: TopContributingFile[]
  nextActions?: string[]
  summary?:
    | string
    | {
        predictedRiskScore?: number
        predictedRiskLevel?: string
        predictedDebtScore?: number
        predictedDebtLevel?: string
      }
  fixSuggestions?: FixSuggestion[]
  refactorPriority?: RefactorPriorityItem[]
}

export type Recommendations = {
  fixSuggestions?: FixSuggestion[]
  topFilesToFix?: RefactorPriorityItem[]
}

export type ArchitectureSummary = {
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

export type ArchitectureDirectoryHotspot = {
  directoryPath: string
  fileCount?: number
  loc?: number
  locShare?: number
  issueCount?: number
  hotspotCount?: number
  score?: number
}

export type ArchitectureFileHotspot = {
  filePath: string
  loc?: number
  findingCount?: number
  hotspotScore?: number
  score?: number
  reasons?: string[]
}

export type ArchitectureSmell = {
  id?: string
  title?: string
  severity?: string
  message?: string
  evidence?: Record<string, unknown>
  recommendation?: string
}

export type CouplingHotspot = {
  filePath: string
  internalImportCount?: number
  internalInboundCount?: number
  score?: number
  reasons?: string[]
}

export type DependencyHub = {
  filePath: string
  inboundDependencyCount?: number
  score?: number
  reasons?: string[]
}

export type BoundaryWarning = {
  sourceDirectory: string
  targetDirectory: string
  crossImportCount?: number
  severity?: string
  message?: string
}

export type DirectoryCouplingHotspot = {
  directoryPath: string
  crossImportCount?: number
  uniqueTargetDirectories?: number
  score?: number
}

export type ArchitectureInsights = {
  summary?: ArchitectureSummary
  directoryHotspots?: ArchitectureDirectoryHotspot[]
  fileHotspots?: ArchitectureFileHotspot[]
  possibleGodFiles?: ArchitectureFileHotspot[]
  smells?: ArchitectureSmell[]
  recommendations?: string[]
  couplingHotspots?: CouplingHotspot[]
  dependencyHubs?: DependencyHub[]
  boundaryWarnings?: BoundaryWarning[]
  directoryCouplingHotspots?: DirectoryCouplingHotspot[]
}

export type AiRiskExplanation = {
  title?: string
  level?: string
  narrative?: string
  bullets?: string[]
}

export type AiRefactorPlan = {
  title?: string
  steps?: string[]
}

export type AiInsights = {
  version?: string
  summary?: string
  simpleSummary?: string
  simpleHighlights?: string[]
  llmEnhanced?: boolean
  summarySource?: "llm" | "fallback" | string
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

export type ScanResults = {
  healthScore: number
  grade: string
  subScores: {
    quality: number
    security: number
    maintainability: number
  }
  findings: Finding[]
  metrics: {
    languages: LanguageMetric[] | Record<string, number>
    complexityHotspots: ComplexityHotspot[]
    files?: number
    loc?: number
  }

  ml?: MlInsights
  ai?: AiInsights
  recommendations?: Recommendations
  architecture?: ArchitectureInsights

  summaries?: {
    architecture?: ArchitectureSummary
    risk?: Record<string, unknown>
    fileFeatures?: Record<string, unknown>
    pr?: Record<string, unknown>
    ml?: Record<string, unknown>
    ai?: Record<string, unknown>
  }

  riskPrediction?: {
    score?: number
    level?: string
  }
  technicalDebtPrediction?: {
    score?: number
    level?: string
  }
  explanations?: {
    risk?: ExplanationBlock
    technicalDebt?: ExplanationBlock
  }
  topContributingFiles?: TopContributingFile[]
  nextActions?: string[]
  summary?: string

  fix_suggestions?: FixSuggestion[]
  top_files_to_fix?: RefactorPriorityItem[]

  fixSuggestions?: FixSuggestion[]
  refactorPriority?: RefactorPriorityItem[]

  file_feature_summary?: any
  file_features?: any[]
}

export type ScanResultsResponse = {
  scan_id: string
  result_json: ScanResults
}

export type ScanChatRequest = {
  question: string
}

export type ScanChatCitation = {
  type: string
  label: string
  filePath?: string | null
  section?: string | null
  reason?: string | null
}

export type ScanChatResponse = {
  answer: string
  citations: ScanChatCitation[]
  matchedSections: string[]
  confidence: string
}

export type CompareVerdict = "improved" | "regressed" | "unchanged"

export type CompareSeverityCounts = {
  critical: number
  high: number
  medium: number
  low: number
}

export type CompareFindingItem = {
  fingerprint: string
  id?: string | null
  title?: string | null
  ruleId?: string | null
  severity?: string | null
  filePath?: string | null
  message?: string | null
  type?: string | null
}

export type CompareOverview = {
  baseHealthScore: number | null
  targetHealthScore: number | null
  healthScoreDelta: number
  baseGrade: string | null
  targetGrade: string | null
  gradeChanged: boolean
}

export type CompareFindingsSection = {
  baseCounts: CompareSeverityCounts
  targetCounts: CompareSeverityCounts
  deltas: CompareSeverityCounts
  newFindings: CompareFindingItem[]
  resolvedFindings: CompareFindingItem[]
}

export type CompareRefactorFileChange = {
  filePath: string
  baseRank?: number | null
  targetRank?: number | null
  direction: "improved" | "regressed" | "new" | "resolved" | "unchanged"
  basePriorityScore?: number | null
  targetPriorityScore?: number | null
  priorityScoreDelta?: number | null
}

export type CompareRefactorSection = {
  topChangedFiles: CompareRefactorFileChange[]
}

export type CompareArchitectureSection = {
  baseRiskScore: number
  targetRiskScore: number
  riskDelta: number
  possibleGodFilesDelta: number
  hotspotDirectoriesDelta: number
  architectureSmellsDelta: number
  couplingHotspotsDelta: number
  dependencyHubsDelta: number
  boundaryWarningsDelta: number
}

export type CompareMlSection = {
  basePredictedRiskScore: number | null
  targetPredictedRiskScore: number | null
  riskScoreDelta: number
  basePredictedDebtScore: number | null
  targetPredictedDebtScore: number | null
  debtScoreDelta: number
  basePredictedRiskLevel?: string | null
  targetPredictedRiskLevel?: string | null
  basePredictedDebtLevel?: string | null
  targetPredictedDebtLevel?: string | null
}

export type ScanCompareResponse = {
  baseScanId: string
  targetScanId: string
  verdict: CompareVerdict
  summary: string
  overview: CompareOverview
  findings: CompareFindingsSection
  refactor: CompareRefactorSection
  architecture: CompareArchitectureSection
  ml: CompareMlSection
}

export type TeamDistributionItem = {
  label: string
  count: number
}

export type TeamOverviewSummary = {
  total_scans: number
  completed_scans: number
  average_health_score: number | null
  average_predicted_risk_score: number | null
  average_predicted_debt_score: number | null
}

export type TeamRepoRiskItem = {
  repo_key: string
  repo_label: string
  completed_scans: number
  average_health_score: number | null
  average_predicted_risk_score: number | null
  average_predicted_debt_score: number | null
  latest_scan_id: string | null
  latest_scan_created_at: string | null
}

export type TeamTrendItem = {
  date: string
  completed_scans: number
  average_health_score: number | null
  average_predicted_risk_score: number | null
  average_predicted_debt_score: number | null
}

export type TeamLatestCompletedScan = {
  scan_id: string
  repo_key: string
  repo_label: string
  source_type: string
  status: string
  health_score: number | null
  grade: string | null
  predicted_risk_score: number | null
  predicted_risk_level: string | null
  predicted_debt_score: number | null
  predicted_debt_level: string | null
  created_at: string
}

export type TeamOverviewResponse = {
  summary: TeamOverviewSummary
  grade_distribution: TeamDistributionItem[]
  risk_level_distribution: TeamDistributionItem[]
  top_risky_repos: TeamRepoRiskItem[]
  recent_trend: TeamTrendItem[]
  latest_completed_scans: TeamLatestCompletedScan[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {})

  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }

  return (await res.json()) as T
}

export function createScan(body: CreateScanBody) {
  return request<ScanRecord>("/api/scans", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function uploadZipScan(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  return request<ScanRecord>("/api/scans/upload-zip", {
    method: "POST",
    body: formData,
  })
}

export function getScan(scanId: string) {
  return request<ScanRecord>(`/api/scans/${scanId}`, { method: "GET" })
}

export function getScanResults(scanId: string) {
  return request<ScanResultsResponse>(`/api/scans/${scanId}/results`, {
    method: "GET",
  })
}

export function chatWithScan(scanId: string, body: ScanChatRequest) {
  return request<ScanChatResponse>(`/api/scans/${scanId}/chat`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function compareScans(baseScanId: string, targetScanId: string) {
  return request<ScanCompareResponse>(
    `/api/scans/compare?base_scan_id=${encodeURIComponent(
      baseScanId
    )}&target_scan_id=${encodeURIComponent(targetScanId)}`,
    { method: "GET" }
  )
}

export function listScans(limit = 20, offset = 0) {
  return request<ScanRecord[]>(
    `/api/scans?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(
      offset
    )}`,
    { method: "GET" }
  )
}

export function getTeamOverview(trendDays = 14, latestLimit = 10) {
  return request<TeamOverviewResponse>(
    `/api/team/overview?trend_days=${encodeURIComponent(
      trendDays
    )}&latest_limit=${encodeURIComponent(latestLimit)}`,
    { method: "GET" }
  )
}

export type AiFixResponse = {
  success: boolean
  explanation: string
  beforeCode: string
  afterCode: string
  gitDiff: string
  safetyImpact: string
  source: string
}

export function generateFindingAiFix(
  scanId: string,
  payload: {
    ruleId?: string
    title: string
    message?: string
    filePath?: string
    snippet?: string
  }
) {
  return request<AiFixResponse>(`/api/scans/${scanId}/findings/ai-fix`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}