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

export type ArchitectureInsights = {
  summary?: ArchitectureSummary
  directoryHotspots?: ArchitectureDirectoryHotspot[]
  fileHotspots?: ArchitectureFileHotspot[]
  possibleGodFiles?: ArchitectureFileHotspot[]
  smells?: ArchitectureSmell[]
  recommendations?: string[]
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
  recommendations?: Recommendations
  architecture?: ArchitectureInsights

  summaries?: {
    architecture?: ArchitectureSummary
    risk?: Record<string, unknown>
    fileFeatures?: Record<string, unknown>
    pr?: Record<string, unknown>
    ml?: Record<string, unknown>
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
}

export type ScanResultsResponse = {
  scan_id: string
  result_json: ScanResults
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

export function listScans(limit = 20, offset = 0) {
  return request<ScanRecord[]>(
    `/api/scans?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(
      offset
    )}`,
    { method: "GET" }
  )
}