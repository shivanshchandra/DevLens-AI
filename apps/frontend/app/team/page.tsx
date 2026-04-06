"use client"

import { useEffect, useState } from "react"
import { BarChart3, RefreshCw, Sparkles, Users } from "lucide-react"

import { AppShell } from "@/components/layout/app-shell"
import { EmptyState } from "@/components/shared/empty-state"
import { TeamOverview } from "@/components/team/team-overview"
import { TeamRiskTable } from "@/components/team/team-risk-table"
import { TeamTrends } from "@/components/team/team-trends"
import { Button } from "@/components/ui/button"
import { PageErrorState } from "@/components/ui/page-error-state"
import { PageLoadingState } from "@/components/ui/page-loading-state"
import { getTeamOverview, TeamOverviewResponse } from "@/lib/api/client"

export default function TeamPage() {
  const [data, setData] = useState<TeamOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      setLoading(true)
      setError(null)

      const res = await getTeamOverview(14, 10)
      setData(res)
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
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HERO HEADER */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-premium-grid bg-white/[0.02] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:px-8 md:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_25%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
                <Users className="h-3.5 w-3.5" />
                Team intelligence
              </div>

              <h1 className="text-gradient-premium text-3xl font-semibold sm:text-4xl md:text-5xl">
                Team-wide engineering intelligence
              </h1>

              <p className="mt-4 text-sm text-zinc-400 sm:text-base">
                Track trends, risks, and code health across all scans, repositories,
                and engineering activity.
              </p>
            </div>

            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </section>

        {/* LOADING */}
        {loading && !data && (
          <PageLoadingState
            title="Loading team analytics..."
            description="Aggregating scan data across repositories and history."
          />
        )}

        {/* ERROR */}
        {error && !data && (
          <PageErrorState
            title="Unable to load team dashboard"
            description={error}
            onRetry={refresh}
          />
        )}

        {/* EMPTY */}
        {!loading && !data && !error && (
          <EmptyState
            title="No team analytics yet"
            description="Run and complete a few scans to unlock team-wide insights."
          />
        )}

        {/* SUCCESS */}
        {data && (
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
        )}
      </div>
    </AppShell>
  )
}