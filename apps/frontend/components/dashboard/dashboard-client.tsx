"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, FileText, Loader2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { ReportView } from "@/components/report/report-view"
import { getScanResults } from "@/lib/api/client"

export function DashboardClient({ scanId }: { scanId: string }) {
  const [results, setResults] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await getScanResults(scanId)
        if (!mounted) return
        setResults(res.result_json)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? "Results not available yet.")
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [scanId])

  // ❌ ERROR STATE (PREMIUM)
  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Alert
          variant="destructive"
          className="rounded-[24px] border-red-500/20 bg-red-500/10 text-red-200"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load report</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Card className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
          <div className="space-y-4">
            <div className="text-lg font-medium text-white">
              What you can do next
            </div>

            <ul className="space-y-2 text-sm text-zinc-400">
              <li>• Check if the scan has completed</li>
              <li>• Retry the scan if it failed</li>
              <li>• Go back and start a new analysis</li>
            </ul>

            <div className="flex gap-3 pt-3">
              <Button asChild>
                <Link href="/analyze">Start new scan</Link>
              </Button>

              <Button variant="outline" asChild>
                <Link href="/history">View history</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // ⏳ LOADING STATE (PREMIUM)
  if (!results) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          <h1 className="text-xl font-semibold text-white">
            Preparing your report...
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="h-32 animate-pulse rounded-[20px] bg-white/[0.03]" />
          <Card className="h-32 animate-pulse rounded-[20px] bg-white/[0.03]" />
          <Card className="h-40 animate-pulse rounded-[20px] bg-white/[0.03] md:col-span-2" />
        </div>

        <p className="text-sm text-zinc-500">
          We are fetching your scan results and building the dashboard.
        </p>
      </div>
    )
  }

  // ✅ SUCCESS STATE
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <FileText className="h-4 w-4" />
            Scan Report
          </div>

          <h1 className="text-2xl font-semibold text-white">
            Analysis results
          </h1>

          <p className="text-sm text-zinc-400">
            Review code health, findings, risks, and AI-generated insights.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/compare">Compare scans</Link>
          </Button>

          <Button asChild>
            <Link href="/analyze">
              New scan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* REPORT */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-4 md:p-6">
        <ReportView scanId={scanId} results={results} />
      </div>
    </div>
  )
}