"use client"

import { useMemo, useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getAllMockScans } from "@/lib/mock/scans"
import { CompareSelector } from "@/components/compare/compare-selector"
import { CompareView } from "@/components/compare/compare-view"
import { EmptyState } from "@/components/shared/empty-state"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ComparePage() {
  const scans = useMemo(() => getAllMockScans(), [])
  const [a, setA] = useState<string>("")
  const [b, setB] = useState<string>("")

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
          <p className="text-sm text-muted-foreground">
            Compare two scans and see improvements or regressions.
          </p>
        </div>

        {scans.length < 2 ? (
          <EmptyState
            title="Not enough scans to compare"
            description="Run at least two scans to unlock comparison."
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