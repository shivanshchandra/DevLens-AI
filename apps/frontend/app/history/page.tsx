"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Clock3,
  FolderGit2,
  GitPullRequest,
  History,
  RefreshCw,
  Upload,
} from "lucide-react"

import { AppShell } from "@/components/layout/app-shell"
import { HistoryTable } from "@/components/history/history-table"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageErrorState } from "@/components/ui/page-error-state"
import { PageLoadingState } from "@/components/ui/page-loading-state"
import { toast } from "@/hooks/use-toast"
import { listScans, ScanRecord } from "@/lib/api/client"

function countByStatus(scans: ScanRecord[], status: ScanRecord["status"]) {
  return scans.filter((scan) => scan.status === status).length
}

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  async function refresh(showToast = true) {
    setError(null)
    setLoading(true)

    try {
      const data = await listScans(50, 0)
      setScans(data)
      setHasLoadedOnce(true)

      if (showToast) {
        toast({ title: "History refreshed" })
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load history.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summary = useMemo(() => {
    const completed = countByStatus(scans, "completed")
    const running = countByStatus(scans, "running") + countByStatus(scans, "queued")
    const failed = countByStatus(scans, "failed")

    const repoCount = scans.filter((scan) => scan.source_type === "github").length
    const prCount = scans.filter((scan) => scan.source_type === "pr").length
    const zipCount = scans.filter((scan) => scan.source_type === "zip").length

    return {
      total: scans.length,
      completed,
      running,
      failed,
      repoCount,
      prCount,
      zipCount,
    }
  }, [scans])

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-premium-grid bg-white/[0.02] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:px-8 md:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_25%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
                <History className="h-3.5 w-3.5" />
                Scan history
              </div>

              <h1 className="text-gradient-premium text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                Review previous scans and jump back into results.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                Reopen completed dashboards, track running scans, and copy public report links
                from one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => refresh(true)} disabled={loading}>
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                {loading ? "Refreshing..." : "Refresh history"}
              </Button>

              <Button asChild>
                <Link href="/analyze">Start new scan</Link>
              </Button>
            </div>
          </div>
        </section>

        {!hasLoadedOnce && loading ? (
          <PageLoadingState
            title="Loading scan history..."
            description="We are fetching your recent scans so you can reopen dashboards and continue where you left off."
          />
        ) : null}

        {!hasLoadedOnce && error ? (
          <PageErrorState
            title="Unable to load scan history"
            description={error}
            onRetry={() => refresh(false)}
            retryLabel="Retry loading"
            primaryHref="/analyze"
            primaryLabel="Start a new scan"
          />
        ) : null}

        {hasLoadedOnce ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-[24px]">
                <CardContent className="p-5">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Total scans
                  </div>
                  <div className="text-2xl font-semibold text-white">{summary.total}</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    All scans returned from the backend history endpoint.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-[24px]">
                <CardContent className="p-5">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Completed
                  </div>
                  <div className="text-2xl font-semibold text-white">{summary.completed}</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Ready to open in the full dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-[24px]">
                <CardContent className="p-5">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    In progress
                  </div>
                  <div className="text-2xl font-semibold text-white">{summary.running}</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Queued or running scans still being processed.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-[24px]">
                <CardContent className="p-5">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Failed
                  </div>
                  <div className="text-2xl font-semibold text-white">{summary.failed}</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Scans that stopped before dashboard completion.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-[24px]">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
                    <FolderGit2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Repository scans</div>
                    <div className="text-sm text-zinc-400">{summary.repoCount} total</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[24px]">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
                    <GitPullRequest className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Pull request scans</div>
                    <div className="text-sm text-zinc-400">{summary.prCount} total</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[24px]">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">ZIP scans</div>
                    <div className="text-sm text-zinc-400">{summary.zipCount} total</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {error ? (
              <Card className="rounded-[24px] border border-amber-500/20 bg-amber-500/10">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                      <Clock3 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-amber-100">
                        Could not refresh the latest history
                      </div>
                      <p className="mt-1 text-sm leading-6 text-amber-200/90">{error}</p>
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => refresh(true)} disabled={loading}>
                    <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {scans.length === 0 && !loading ? (
              <EmptyState
                title="No scans yet"
                description="Start your first repository, ZIP, or PR scan to generate reports and history."
                action={
                  <Button asChild>
                    <Link href="/analyze">Start your first scan</Link>
                  </Button>
                }
              />
            ) : (
              <Card className="rounded-[28px]">
                <CardContent className="p-0 md:p-0">
                  <HistoryTable scans={scans} />
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  )
}