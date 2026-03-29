"use client"

import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorState } from "@/components/shared/error-state"
import {
  compareScans,
  type CompareRefactorFileChange,
  type ScanCompareResponse,
} from "@/lib/api/client"

function formatDelta(value: number | null | undefined, inverseGood = false) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—"
  if (value === 0) return "0"
  const prefix = value > 0 ? "+" : ""
  const formatted = Number.isInteger(value) ? `${prefix}${value}` : `${prefix}${value.toFixed(2)}`
  return inverseGood ? formatted : formatted
}

function verdictBadge(verdict: ScanCompareResponse["verdict"]) {
  if (verdict === "improved") return <Badge variant="outline">Improved</Badge>
  if (verdict === "regressed") return <Badge variant="destructive">Regressed</Badge>
  return <Badge variant="secondary">Unchanged</Badge>
}

function deltaBadge(value: number, inverseGood = false) {
  const improved = inverseGood ? value < 0 : value > 0
  const regressed = inverseGood ? value > 0 : value < 0

  if (improved) return <Badge variant="outline">Improved</Badge>
  if (regressed) return <Badge variant="destructive">Regressed</Badge>
  return <Badge variant="secondary">No change</Badge>
}

function directionBadge(direction: CompareRefactorFileChange["direction"]) {
  switch (direction) {
    case "regressed":
      return <Badge variant="destructive">Regressed</Badge>
    case "new":
      return <Badge variant="destructive">New</Badge>
    case "improved":
      return <Badge variant="outline">Improved</Badge>
    case "resolved":
      return <Badge variant="secondary">Resolved</Badge>
    default:
      return <Badge variant="secondary">Unchanged</Badge>
  }
}

function severityDeltaRows(
  deltas: ScanCompareResponse["findings"]["deltas"]
) {
  return [
    { label: "Critical", value: deltas.critical },
    { label: "High", value: deltas.high },
    { label: "Medium", value: deltas.medium },
    { label: "Low", value: deltas.low },
  ]
}

export function CompareView({ a, b }: { a: string; b: string }) {
  const [comparison, setComparison] = useState<ScanCompareResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const result = await compareScans(a, b)
        if (!mounted) return

        setComparison(result)
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
            Fetching comparison data from backend.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !comparison) {
    return (
      <ErrorState
        title="Missing comparison"
        description={error ?? "Unable to load comparison for the selected scans."}
      />
    )
  }

  const { verdict, summary, overview, findings, architecture, ml, refactor } = comparison

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Comparison overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Comparing <span className="font-mono">{a.slice(0, 8)}</span> →{" "}
              <span className="font-mono">{b.slice(0, 8)}</span>
            </div>
            {verdictBadge(verdict)}
          </div>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-semibold">{overview.targetHealthScore ?? "—"}</div>
          <div className="text-sm text-muted-foreground">
            Base: {overview.baseHealthScore ?? "—"} → Target: {overview.targetHealthScore ?? "—"}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Δ {formatDelta(overview.healthScoreDelta)}</span>
            {deltaBadge(overview.healthScoreDelta)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-semibold">{overview.targetGrade ?? "—"}</div>
          <div className="text-sm text-muted-foreground">
            Base: {overview.baseGrade ?? "—"} → Target: {overview.targetGrade ?? "—"}
          </div>
          <div className="text-sm text-muted-foreground">
            {overview.gradeChanged ? "Grade changed" : "No grade change"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New vs resolved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-semibold">
            {findings.newFindings.length} / {findings.resolvedFindings.length}
          </div>
          <div className="text-sm text-muted-foreground">
            New findings / resolved findings
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Severity deltas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {severityDeltaRows(findings.deltas).map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-medium">Δ {formatDelta(item.value)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Architecture risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-semibold">{architecture.targetRiskScore}</div>
          <div className="text-sm text-muted-foreground">
            Base: {architecture.baseRiskScore} → Target: {architecture.targetRiskScore}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Δ {formatDelta(architecture.riskDelta)}</span>
            {deltaBadge(architecture.riskDelta, true)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Predicted risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xl font-semibold">{ml.targetPredictedRiskLevel ?? "—"}</div>
          <div className="text-sm text-muted-foreground">
            Score: {ml.targetPredictedRiskScore ?? "—"}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Δ {formatDelta(ml.riskScoreDelta)}</span>
            {deltaBadge(ml.riskScoreDelta, true)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Predicted debt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xl font-semibold">{ml.targetPredictedDebtLevel ?? "—"}</div>
          <div className="text-sm text-muted-foreground">
            Score: {ml.targetPredictedDebtScore ?? "—"}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Δ {formatDelta(ml.debtScoreDelta)}</span>
            {deltaBadge(ml.debtScoreDelta, true)}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Architecture detail deltas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="text-sm">
            <div className="font-medium">God files</div>
            <div className="text-muted-foreground">Δ {formatDelta(architecture.possibleGodFilesDelta)}</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">Hotspot directories</div>
            <div className="text-muted-foreground">Δ {formatDelta(architecture.hotspotDirectoriesDelta)}</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">Architecture smells</div>
            <div className="text-muted-foreground">Δ {formatDelta(architecture.architectureSmellsDelta)}</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">Coupling hotspots</div>
            <div className="text-muted-foreground">Δ {formatDelta(architecture.couplingHotspotsDelta)}</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">Dependency hubs</div>
            <div className="text-muted-foreground">Δ {formatDelta(architecture.dependencyHubsDelta)}</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">Boundary warnings</div>
            <div className="text-muted-foreground">Δ {formatDelta(architecture.boundaryWarningsDelta)}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Top changed files</CardTitle>
        </CardHeader>
        <CardContent>
          {refactor.topChangedFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No refactor priority movement detected.
            </div>
          ) : (
            <div className="space-y-3">
              {refactor.topChangedFiles.map((file) => (
                <div
                  key={file.filePath}
                  className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-mono text-sm">{file.filePath}</div>
                    <div className="text-xs text-muted-foreground">
                      Base rank: {file.baseRank ?? "—"} → Target rank: {file.targetRank ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {directionBadge(file.direction)}
                    <span className="text-xs text-muted-foreground">
                      Priority Δ {file.priorityScoreDelta ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {findings.newFindings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No new findings.</div>
          ) : (
            findings.newFindings.slice(0, 5).map((finding) => (
              <div key={finding.fingerprint} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{finding.title ?? "Untitled finding"}</div>
                <div className="text-xs text-muted-foreground">
                  {finding.severity ?? "unknown"} • {finding.filePath ?? "unknown path"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resolved findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {findings.resolvedFindings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No resolved findings.</div>
          ) : (
            findings.resolvedFindings.slice(0, 5).map((finding) => (
              <div key={finding.fingerprint} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{finding.title ?? "Untitled finding"}</div>
                <div className="text-xs text-muted-foreground">
                  {finding.severity ?? "unknown"} • {finding.filePath ?? "unknown path"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}