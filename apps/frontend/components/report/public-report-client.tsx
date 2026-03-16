"use client"

import { ReportView } from "@/components/report/report-view"
import type { ScanResults } from "@/lib/api/client"

export function PublicReportClient({
  scanId,
  results,
}: {
  scanId: string
  results: ScanResults
}) {
  return <ReportView scanId={scanId} results={results} isPublic />
}