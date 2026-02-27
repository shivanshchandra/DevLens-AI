const KEY = "devlens_results_v1"

export type MockFinding = {
  id: string
  type: "security" | "quality" | "complexity"
  severity: "low" | "medium" | "high" | "critical"
  title: string
  filePath: string
  message: string
}

export type MockResults = {
  scanId: string
  healthScore: number
  grade: "A" | "B" | "C" | "D"
  subScores: {
    quality: number
    security: number
    maintainability: number
  }
  metrics: {
    files: number
    loc: number
    languages: { name: string; percent: number }[]
    complexityHotspots: { filePath: string; score: number }[]
  }
  findings: MockFinding[]
  generatedAt: string
}

function readAll(): Record<string, MockResults> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, MockResults>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, MockResults>) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function saveMockResults(results: MockResults) {
  const all = readAll()
  all[results.scanId] = results
  writeAll(all)
}

export function getMockResults(scanId: string): MockResults | null {
  const all = readAll()
  return all[scanId] ?? null
}

function gradeFromScore(score: number): MockResults["grade"] {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 70) return "C"
  return "D"
}

export function generateMockResults(scanId: string): MockResults {
  const healthScore = Math.floor(72 + Math.random() * 22) // 72–94
  const quality = Math.floor(65 + Math.random() * 30)
  const security = Math.floor(70 + Math.random() * 28)
  const maintainability = Math.floor(60 + Math.random() * 32)

  const results: MockResults = {
    scanId,
    healthScore,
    grade: gradeFromScore(healthScore),
    subScores: { quality, security, maintainability },
    metrics: {
      files: Math.floor(120 + Math.random() * 400),
      loc: Math.floor(5000 + Math.random() * 45000),
      languages: [
        { name: "TypeScript", percent: 58 },
        { name: "Python", percent: 24 },
        { name: "Markdown", percent: 10 },
        { name: "Other", percent: 8 },
      ],
      complexityHotspots: [
        { filePath: "apps/api/src/routes/auth.py", score: 78 },
        { filePath: "services/scanner/src/analyzers/eslint.ts", score: 71 },
        { filePath: "apps/frontend/app/dashboard/page.tsx", score: 63 },
      ],
    },
        findings: [
      {
        id: crypto.randomUUID(),
        type: "security",
        severity: "critical",
        title: "Hardcoded secret detected",
        filePath: "apps/api/.env.example",
        message: "Potential secret pattern found. Use environment variables and secret managers.",
      },
      {
        id: crypto.randomUUID(),
        type: "security",
        severity: "high",
        title: "Vulnerable dependency detected",
        filePath: "package.json",
        message: "Dependency matches a known advisory. Upgrade to a patched version.",
      },
      {
        id: crypto.randomUUID(),
        type: "quality",
        severity: "medium",
        title: "Lint warnings clustered",
        filePath: "apps/frontend/components/analyze/repo-tab.tsx",
        message: "Multiple warnings suggest missing validation and error boundaries.",
      },
      {
        id: crypto.randomUUID(),
        type: "quality",
        severity: "low",
        title: "Inconsistent naming",
        filePath: "services/scanner/src/utils.ts",
        message: "Consider consistent naming conventions and extracting constants.",
      },
      {
        id: crypto.randomUUID(),
        type: "complexity",
        severity: "high",
        title: "High cyclomatic complexity",
        filePath: "services/scanner/src/core/pipeline.ts",
        message: "Split into smaller functions and add tests around edge cases.",
      },
      {
        id: crypto.randomUUID(),
        type: "complexity",
        severity: "medium",
        title: "Large file size (low cohesion)",
        filePath: "apps/frontend/app/dashboard/[scanId]/page.tsx",
        message: "Break into smaller components for readability and reusability.",
      },
    ],
    generatedAt: new Date().toISOString(),
  }

  return results
}