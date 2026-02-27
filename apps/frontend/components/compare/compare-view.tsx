"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getMockResults } from "@/lib/mock/results"
import { ErrorState } from "@/components/shared/error-state"

function delta(a: number, b: number) {
  const d = b - a
  return d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`
}

function deltaBadge(d: number) {
  if (d > 0) return <Badge variant="outline">Improved</Badge>
  if (d < 0) return <Badge variant="destructive">Regressed</Badge>
  return <Badge variant="secondary">No change</Badge>
}

export function CompareView({ a, b }: { a: string; b: string }) {
  const A = getMockResults(a)
  const B = getMockResults(b)

  if (!A || !B) {
    return (
      <ErrorState
        title="Missing results"
        description="One of the selected scans doesn't have results available."
      />
    )
  }

  const healthDelta = B.healthScore - A.healthScore

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
    </div>
  )
}