"use client"

import { useEffect, useState } from "react"

import { AppShell } from "@/components/layout/app-shell"
import { EmptyState } from "@/components/shared/empty-state"
import { TeamOverview } from "@/components/team/team-overview"
import { TeamRiskTable } from "@/components/team/team-risk-table"
import { TeamTrends } from "@/components/team/team-trends"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { getTeamOverview, TeamOverviewResponse } from "@/lib/api/client"

export default function TeamPage() {
  const [data, setData] = useState<TeamOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)

    try {
      const res = await getTeamOverview(14, 10)
      setData(res)
      toast({ title: "Team dashboard refreshed" })
    } catch (e: any) {
      setError(e?.message ?? "Failed to load team overview.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Team Mode</h1>
            <p className="text-sm text-muted-foreground">
              Cross-scan engineering intelligence across repositories and history.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {!loading && !data ? (
          <EmptyState
            title="No team analytics yet"
            description="Complete a few scans first, then refresh this dashboard."
          />
        ) : loading && !data ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading team dashboard…</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Fetching aggregated analytics from backend.
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <TeamOverview summary={data.summary} />
            <TeamTrends
              gradeDistribution={data.grade_distribution}
              riskDistribution={data.risk_level_distribution}
              trend={data.recent_trend}
            />
            <TeamRiskTable
              topRiskyRepos={data.top_risky_repos}
              latestCompletedScans={data.latest_completed_scans}
            />
          </>
        ) : null}
      </div>
    </AppShell>
  )
}