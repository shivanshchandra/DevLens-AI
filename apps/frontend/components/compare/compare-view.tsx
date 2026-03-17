"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ErrorState } from "@/components/shared/error-state"
import { getScanResults, type ScanResults } from "@/lib/api/client"

function delta(a: number, b: number) {
  const d = b - a
  return d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`
}

function deltaBadge(d: number) {
  if (d > 0) return <Badge variant="outline">Improved</Badge>
  if (d < 0) return <Badge variant="destructive">Regressed</Badge>
  return <Badge variant="secondary">No change</Badge>
}

function formatScore(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—"
  return value.toFixed(2)
}

function normalizeMl(results: ScanResults) {
  const ml = results.ml ?? {}
  const summary = ml.summary

  const riskPrediction =
    ml.riskPrediction ??
    results.riskPrediction ??
    (summary && typeof summary !== "string"
      ? {
          score: summary.predictedRiskScore,
          level: summary.predictedRiskLevel,
        }
      : undefined)

  const technicalDebtPrediction =
    ml.technicalDebtPrediction ??
    results.technicalDebtPrediction ??
    (summary && typeof summary !== "string"
      ? {
          score: summary.predictedDebtScore,
          level: summary.predictedDebtLevel,
        }
      : undefined)

  return {
    riskPrediction,
    technicalDebtPrediction,
  }
}

export function CompareView({ a, b }: { a: string; b: string }) {
  const [A, setAResults] = useState<ScanResults | null>(null)
  const [B, setBResults] = useState<ScanResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [aRes, bRes] = await Promise.all([getScanResults(a), getScanResults(b)])
        if (!mounted) return

        setAResults(aRes.result_json)
        setBResults(bRes.result_json)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? "Failed to load comparison results.")
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    if (a && b) {
      load()
    }

    return () => {
      mounted = false
    }
  }, [a, b])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Loading comparison…</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fetching scan results from backend.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !A || !B) {
    return (
      <ErrorState
        title="Missing results"
        description={error ?? "One of the selected scans doesn't have results available."}
      />
    )
  }

  const healthDelta = B.healthScore - A.healthScore
  const qualityDelta = B.subScores.quality - A.subScores.quality
  const securityDelta = B.subScores.security - A.subScores.security
  const maintainabilityDelta = B.subScores.maintainability - A.subScores.maintainability
  const findingsDelta = (B.findings?.length ?? 0) - (A.findings?.length ?? 0)

  const mlA = normalizeMl(A)
  const mlB = normalizeMl(B)

  const riskScoreA = mlA.riskPrediction?.score
  const riskScoreB = mlB.riskPrediction?.score
  const debtScoreA = mlA.technicalDebtPrediction?.score
  const debtScoreB = mlB.technicalDebtPrediction?.score

  const riskDelta =
    typeof riskScoreA === "number" && typeof riskScoreB === "number"
      ? riskScoreB - riskScoreA
      : null

  const debtDelta =
    typeof debtScoreA === "number" && typeof debtScoreB === "number"
      ? debtScoreB - debtScoreA
      : null

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Comparing <span className="font-mono">{a.slice(0, 8)}</span> →{" "}
            <span className="font-mono">{b.slice(0, 8)}</span>
          </div>
          {deltaBadge(healthDelta)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-semibold">{B.healthScore}</div>
          <div className="text-sm text-muted-foreground">
            Δ {delta(A.healthScore, B.healthScore)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-semibold">{B.subScores.quality}</div>
          <div className="text-sm text-muted-foreground">Δ {delta(A.subScores.quality, B.subScores.quality)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-semibold">{B.subScores.security}</div>
          <div className="text-sm text-muted-foreground">
            Δ {delta(A.subScores.security, B.subScores.security)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintainability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-semibold">{B.subScores.maintainability}</div>
          <div className="text-sm text-muted-foreground">
            Δ {delta(A.subScores.maintainability, B.subScores.maintainability)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-semibold">{B.findings?.length ?? 0}</div>
          <div className="text-sm text-muted-foreground">
            Δ {delta(A.findings?.length ?? 0, B.findings?.length ?? 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Predicted Risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-xl font-semibold">
            {mlB.riskPrediction?.level ?? "—"}
          </div>
          <div className="text-sm text-muted-foreground">
            Score: {formatScore(riskScoreB)}
          </div>
          <div className="text-sm text-muted-foreground">
            Δ {riskDelta === null ? "—" : delta(riskScoreA ?? 0, riskScoreB ?? 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Predicted Debt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-xl font-semibold">
            {mlB.technicalDebtPrediction?.level ?? "—"}
          </div>
          <div className="text-sm text-muted-foreground">
            Score: {formatScore(debtScoreB)}
          </div>
          <div className="text-sm text-muted-foreground">
            Δ {debtDelta === null ? "—" : delta(debtScoreA ?? 0, debtScoreB ?? 0)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}