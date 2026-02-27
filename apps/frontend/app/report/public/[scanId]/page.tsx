import { AppShell } from "@/components/layout/app-shell"
import { PublicReportClient } from "@/components/report/public-report-client"

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ scanId: string }>
}) {
  const { scanId } = await params

  return (
    <AppShell>
      <PublicReportClient scanId={scanId} />
    </AppShell>
  )
}