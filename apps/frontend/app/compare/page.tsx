"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { AppShell } from "@/components/layout/app-shell"
import { CompareSelector } from "@/components/compare/compare-selector"
import { CompareView } from "@/components/compare/compare-view"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listScans, type ScanRecord } from "@/lib/api/client"

export default function ComparePage() {
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [draftA, setDraftA] = useState<string>("")
  const [draftB, setDraftB] = useState<string>("")
  const [activeA, setActiveA] = useState<string>("")
  const [activeB, setActiveB] = useState<string>("")
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

        if (completedScans.length >= 2) {
          const baseDefault = completedScans[1]?.id || ""
          const targetDefault = completedScans[0]?.id || ""

          setDraftA(baseDefault)
          setDraftB(targetDefault)
          setActiveA(baseDefault)
          setActiveB(targetDefault)
        }
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

  const selectedScanA = useMemo(
    () => scans.find((scan) => scan.id === activeA) ?? null,
    [scans, activeA]
  )

  const selectedScanB = useMemo(
    () => scans.find((scan) => scan.id === activeB) ?? null,
    [scans, activeB]
  )

  function handleCompare() {
    if (!draftA || !draftB || draftA === draftB) return
    setActiveA(draftA)
    setActiveB(draftB)
  }

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
              <CardContent className="space-y-4">
                <CompareSelector
                  scans={scans}
                  draftA={draftA}
                  draftB={draftB}
                  setDraftA={setDraftA}
                  setDraftB={setDraftB}
                  onCompare={handleCompare}
                />

                {selectedScanA || selectedScanB ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">Active base scan</div>
                      {selectedScanA ? (
                        <div className="mt-1 space-y-1 text-muted-foreground">
                          <div className="font-mono text-xs">{selectedScanA.id}</div>
                          <div>{selectedScanA.repo_url ?? "ZIP upload"}</div>
                          <div>
                            {selectedScanA.source_type.toUpperCase()} •{" "}
                            {new Date(selectedScanA.created_at).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-muted-foreground">
                          No active base scan selected.
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">Active target scan</div>
                      {selectedScanB ? (
                        <div className="mt-1 space-y-1 text-muted-foreground">
                          <div className="font-mono text-xs">{selectedScanB.id}</div>
                          <div>{selectedScanB.repo_url ?? "ZIP upload"}</div>
                          <div>
                            {selectedScanB.source_type.toUpperCase()} •{" "}
                            {new Date(selectedScanB.created_at).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-muted-foreground">
                          No active target scan selected.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {activeA && activeB ? <CompareView a={activeA} b={activeB} /> : null}
          </>
        )}
      </div>
    </AppShell>
  )
}