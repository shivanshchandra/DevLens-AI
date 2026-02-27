export type AnalyzeMode = "repo" | "zip" | "pr"

export type CreateScanRequest =
  | { mode: "repo"; payload: { repoUrl: string; branch?: string; commit?: string } }
  | { mode: "zip"; payload: { fileName: string; size: number } }
  | { mode: "pr"; payload: { repoUrl: string; prNumber: number } }

export type MockScanRecord = {
  id: string
  createdAt: string
  request: CreateScanRequest
  status: "queued" | "running" | "completed" | "failed"
}

const KEY = "devlens_scans_v1"

function readAll(): MockScanRecord[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as MockScanRecord[]
  } catch {
    return []
  }
}

function writeAll(scans: MockScanRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(scans))
}

export function createMockScan(request: CreateScanRequest): { scanId: string } {
  const scanId = crypto.randomUUID()

  const record: MockScanRecord = {
    id: scanId,
    createdAt: new Date().toISOString(),
    request,
    status: "queued",
  }

  const scans = readAll()
  writeAll([record, ...scans])

  return { scanId }
}


export function getMockScanById(scanId: string): MockScanRecord | null {
  const scans = readAll()
  return scans.find((s) => s.id === scanId) ?? null
}

export function updateMockScanStatus(scanId: string, status: MockScanRecord["status"]) {
  const scans = readAll()
  const next = scans.map((s) => (s.id === scanId ? { ...s, status } : s))
  writeAll(next)
}

export function getAllMockScans(): MockScanRecord[] {
  const scans = readAll()
  return scans.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function deleteMockScan(scanId: string) {
  const scans = readAll().filter((s) => s.id !== scanId)
  writeAll(scans)
}

export function clearAllMockScans() {
  writeAll([])
}