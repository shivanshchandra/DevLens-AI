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

export type ScanResultsResponse = {
  scan_id: string
  result_json: any
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // important: don’t cache API requests in Next dev
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