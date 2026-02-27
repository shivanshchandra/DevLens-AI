"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

        // Backend returns { scan_id, result_json }
        // Our UI expects the results object directly
        setResults(res.result_json)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? "Results not found yet.")
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [scanId])

  if (error) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Report</h1>
        <Card>
          <CardHeader>
            <CardTitle>No results found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Report</h1>
        <Card>
          <CardHeader>
            <CardTitle>Loading…</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fetching report from backend.
          </CardContent>
        </Card>
      </div>
    )
  }

  return <ReportView scanId={scanId} results={results} />
}