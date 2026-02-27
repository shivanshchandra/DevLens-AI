"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/shared/error-state"
import { ReportView } from "@/components/report/report-view"
import { getScanResults } from "@/lib/api/client"

export function PublicReportClient({ scanId }: { scanId: string }) {
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
        setError(e?.message ?? "Report not found.")
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [scanId])

  if (error) {
    return (
      <ErrorState
        title="Report not found"
        description="This scan ID doesn’t have results available from the backend."
        action={
          <Button asChild>
            <Link href="/analyze">Run a scan</Link>
          </Button>
        }
      />
    )
  }

  if (!results) {
    return (
      <ErrorState
        title="Loading report…"
        description="Fetching report from backend."
        action={
          <Button asChild>
            <Link href="/history">Back to history</Link>
          </Button>
        }
      />
    )
  }

  return <ReportView scanId={scanId} results={results} isPublic />
}