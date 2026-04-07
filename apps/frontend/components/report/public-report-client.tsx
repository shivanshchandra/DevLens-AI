"use client"

import { useEffect, useState } from "react"

import { ReportView } from "@/components/report/report-view"
import { PageErrorState } from "@/components/ui/page-error-state"
import { PageLoadingState } from "@/components/ui/page-loading-state"
import { getScanResults, type ScanResults } from "@/lib/api/client"

export function PublicReportClient({ scanId }: { scanId: string }) {
  const [results, setResults] = useState<ScanResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadResults() {
    try {
      setLoading(true)
      setError(null)

      const res = await getScanResults(scanId)
      setResults(res.result_json)
    } catch (e: any) {
      setError(e?.message ?? "Public report is not available yet.")
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
        setError(e?.message ?? "Public report is not available yet.")
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
      <PageLoadingState
        title="Preparing public report..."
        description="We are fetching the completed scan results for this shared report."
      />
    )
  }

  if (error && !results) {
    return (
      <PageErrorState
        title="Unable to load public report"
        description={error}
        onRetry={loadResults}
        retryLabel="Retry report load"
      />
    )
  }

  if (!results) {
    return null
  }

  return <ReportView scanId={scanId} results={results} isPublic />
}