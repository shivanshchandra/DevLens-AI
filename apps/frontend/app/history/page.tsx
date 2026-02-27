"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { HistoryTable } from "@/components/history/history-table"
import { toast } from "@/hooks/use-toast"
import { listScans, ScanRecord } from "@/lib/api/client"

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const data = await listScans(50, 0)
      setScans(data)
      toast({ title: "History refreshed" })
    } catch (e: any) {
      setError(e?.message ?? "Failed to load history.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">History</h1>
            <p className="text-sm text-muted-foreground">
              Previous scans stored in Postgres (backend).
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </div>

        {scans.length === 0 && !loading ? (
          <EmptyState
            title="No scans yet"
            description="Start your first repository scan to generate a report."
            action={
              <Button asChild>
                <Link href="/analyze">Analyze Repository</Link>
              </Button>
            }
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryTable scans={scans as any} />
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}