"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  History,
  RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ReportView } from "@/components/report/report-view"
import { PageErrorState } from "@/components/ui/page-error-state"
import { PageLoadingState } from "@/components/ui/page-loading-state"
import { AiSummaryCard } from "@/components/dashboard/ai-summary-card"
import { getScanResults } from "@/lib/api/client"

export function DashboardClient({ scanId }: { scanId: string }) {
  const [results, setResults] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadResults() {
    try {
      setLoading(true)
      setError(null)

      const res = await getScanResults(scanId)
      setResults(res.result_json)
    } catch (e: any) {
      setError(e?.message ?? "Results not available yet.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const res = await getScanResults(scanId)
        if (!mounted) return

        setResults(res.result_json)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? "Results not available yet.")
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [scanId])

  if (loading && !results) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageLoadingState
          title="Preparing your report..."
          description="We are fetching the completed scan results and building the dashboard view."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="h-28 animate-pulse rounded-[24px] bg-white/[0.03]" />
          <Card className="h-28 animate-pulse rounded-[24px] bg-white/[0.03]" />
          <Card className="h-28 animate-pulse rounded-[24px] bg-white/[0.03]" />
          <Card className="h-44 animate-pulse rounded-[24px] bg-white/[0.03] md:col-span-3" />
        </div>
      </div>
    )
  }

  if (error && !results) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageErrorState
          title="Unable to load report"
          description={error}
          onRetry={loadResults}
          retryLabel="Retry report load"
          primaryHref="/history"
          primaryLabel="Back to history"
        />

        <Card className="rounded-[24px] border border-white/10 bg-white/[0.03]">
          <CardContent className="space-y-4 p-6">
            <div className="text-lg font-medium text-white">What you can do next</div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <RefreshCw className="h-4 w-4" />
                  Retry report load
                </div>
                <p className="text-sm leading-6 text-zinc-400">
                  Sometimes the dashboard loads before the final report is ready.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <History className="h-4 w-4" />
                  Open history
                </div>
                <p className="text-sm leading-6 text-zinc-400">
                  Return to History to reopen a different completed scan or check recent runs.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <AlertCircle className="h-4 w-4" />
                  Start a new scan
                </div>
                <p className="text-sm leading-6 text-zinc-400">
                  If the current scan failed or is incomplete, start a fresh workflow.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button onClick={loadResults}>
                <RefreshCw className="h-4 w-4" />
                Retry load
              </Button>

              <Button variant="outline" asChild>
                <Link href="/history">
                  <History className="h-4 w-4" />
                  View history
                </Link>
              </Button>

              <Button variant="ghost" asChild>
                <Link href="/analyze">
                  Start new scan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!results) {
    return null
  }

  const ai = results?.ai ?? {}
  const simpleSummary =
    ai?.simpleSummary ||
    ai?.summary ||
    "No simple AI summary is available for this scan yet."

  const simpleHighlights = Array.isArray(ai?.simpleHighlights)
    ? ai.simpleHighlights
    : Array.isArray(ai?.riskExplanation?.bullets)
      ? ai.riskExplanation.bullets.slice(0, 3)
      : []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[24px]">
          <CardContent className="p-5">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Dashboard
            </div>
            <div className="text-lg font-semibold text-white">Report loaded</div>
            <p className="mt-2 text-sm text-zinc-400">
              The completed scan report is ready to review.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardContent className="p-5">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Compare
            </div>
            <div className="text-lg font-semibold text-white">Track deltas</div>
            <p className="mt-2 text-sm text-zinc-400">
              Compare this scan with another completed scan to spot regressions or improvements.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardContent className="p-5">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Next step
            </div>
            <div className="text-lg font-semibold text-white">Act on findings</div>
            <p className="mt-2 text-sm text-zinc-400">
              Use fixes, architecture insights, and AI guidance to prioritize follow-up work.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="outline" asChild>
          <Link href="/compare">
            <ArrowRightLeft className="h-4 w-4" />
            Compare scans
          </Link>
        </Button>

        <Button variant="outline" asChild>
          <Link href="/history">
            <History className="h-4 w-4" />
            Back to history
          </Link>
        </Button>

        <Button asChild>
          <Link href="/analyze">
            New scan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <AiSummaryCard summary={simpleSummary} highlights={simpleHighlights} />

      <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-4 md:p-6">
        <ReportView scanId={scanId} results={results} />
      </div>
    </div>
  )
}