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
      </div>
    )
  }

  if (!results) return null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[24px]">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-white">Report loaded</div>
            <p className="mt-2 text-sm text-zinc-400">
              The completed scan report is ready to review.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-white">Track deltas</div>
            <p className="mt-2 text-sm text-zinc-400">
              Compare scans to spot regressions.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-white">Next step</div>
            <p className="mt-2 text-sm text-zinc-400">
              Act on findings and recommendations.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-4 md:p-6">
        <ReportView scanId={scanId} results={results} />
      </div>
    </div>
  )
}