"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { CompareSelector } from "@/components/compare/compare-selector"
import { CompareView } from "@/components/compare/compare-view"
import { EmptyState } from "@/components/shared/empty-state"
import { listScans, type ScanRecord } from "@/lib/api/client"

export default function ComparePage() {
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [a, setA] = useState<string>("")
  const [b, setB] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const data = await listScans(50, 0)
        if (!mounted) return

        const completedScans = data.filter((scan) => scan.status === "completed")
        setScans(completedScans)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? "Failed to load scans.")
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
  }, [])

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
          <p className="text-sm text-muted-foreground">
            Compare two completed scans and see improvements or regressions.
          </p>
        </div>

        {loading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading scans…</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Fetching completed scans from backend.
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to load scans</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : scans.length < 2 ? (
          <EmptyState
            title="Not enough completed scans to compare"
            description="Run and complete at least two scans to unlock comparison."
            action={
              <Button asChild>
                <Link href="/analyze">Run a scan</Link>
              </Button>
            }
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Select scans</CardTitle>
              </CardHeader>
              <CardContent>
                <CompareSelector scans={scans} a={a} b={b} setA={setA} setB={setB} />
              </CardContent>
            </Card>

            {a && b ? <CompareView a={a} b={b} /> : null}
          </>
        )}
      </div>
    </AppShell>
  )
}