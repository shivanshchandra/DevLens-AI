// apps/frontend/lib/api/client.ts

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"

type CreateScanBody = {
  source_type: "github" | "zip" | "pr"
  repo_url?: string | null
  pr_number?: number | null
}

export type ScanRecord = {
  id: string
  source_type: "github" | "zip" | "pr"
  repo_url: string | null
  pr_number: number | null
  status: "queued" | "running" | "completed" | "failed"
  error_message: string | null
  created_at: string
  updated_at: string
}

export type FindingType = "security" | "quality" | "complexity"
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

export type PredictionSummary = {
  predictedRiskScore?: number
  predictedRiskLevel?: string
  predictedDebtScore?: number
  predictedDebtLevel?: string
}

export type ExplanationBlock = {
  narrative?: string
  reasons?: string[]
  drivers?: string[]
}

export type TopContributingFile = {
  filePath: string
  contributionScore?: number
  estimatedEffort?: string
  recommendedAction?: string
}

export type MlInsights = {
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
  }
  topContributingFiles?: TopContributingFile[]
  nextActions?: string[]
  summary?: string
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
    languages: Record<string, number>
    complexityHotspots: ComplexityHotspot[]
  }
  ml?: MlInsights

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
}

export type ScanResultsResponse = {
  scan_id: string
  result_json: ScanResults
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
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