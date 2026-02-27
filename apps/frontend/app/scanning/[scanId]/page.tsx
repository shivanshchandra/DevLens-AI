import { AppShell } from "@/components/layout/app-shell"
import { ScanningClient } from "@/components/scanning/scanning-client"

export default async function ScanningPage({
  params,
}: {
  params: Promise<{ scanId: string }>
}) {
  const { scanId } = await params

  return (
    <AppShell>
      <ScanningClient scanId={scanId} />
    </AppShell>
  )
}