import { AppShell } from "@/components/layout/app-shell"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export default async function DashboardScanPage({
  params,
}: {
  params: Promise<{ scanId: string }>
}) {
  const { scanId } = await params

  return (
    <AppShell>
      <DashboardClient scanId={scanId} />
    </AppShell>
  )
}