"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { getScan } from "@/lib/api/client"

const STEPS = [
  { key: "deps", label: "Dependencies" },
  { key: "security", label: "Security" },
  { key: "complexity", label: "Complexity" },
  { key: "ml", label: "ML Scoring" },
  { key: "ai", label: "AI Summary" },
] as const

export function ScanningClient({ scanId }: { scanId: string }) {
  const router = useRouter()

  const [activeStep, setActiveStep] = useState(0)
  const [progress, setProgress] = useState(5)
  const [status, setStatus] = useState<"queued" | "running" | "completed" | "failed">("queued")
  const [metaText, setMetaText] = useState<string>("Loading scan info…")
  const [error, setError] = useState<string | null>(null)

  const stepCount = STEPS.length

  useEffect(() => {
    if (!scanId) return

    let tick = 0
    const interval = setInterval(async () => {
      tick++

      // UI-only progress animation (not real progress yet)
      setProgress((p) => Math.min(95, p + Math.random() * 6))
      setActiveStep((s) => Math.min(stepCount - 1, s + (tick % 4 === 0 ? 1 : 0)))

      try {
        const scan = await getScan(scanId)
        setStatus(scan.status)

        const label =
          scan.source_type === "github"
            ? `Repo: ${scan.repo_url}`
            : scan.source_type === "pr"
              ? `PR: ${scan.repo_url} #${scan.pr_number}`
              : "ZIP analysis (upload in next milestone)"

        setMetaText(label)

        if (scan.status === "completed") {
          clearInterval(interval)
          setProgress(100)
          router.push(`/dashboard/${scanId}`)
        }

        if (scan.status === "failed") {
          clearInterval(interval)
          setError(scan.error_message ?? "Scan failed.")
          setProgress(100)
        }
      } catch (e: any) {
        // If backend temporarily fails, show message but keep UI
        setError(e?.message ?? "Failed to fetch scan status.")
      }
    }, 1200)

    return () => clearInterval(interval)
  }, [router, scanId, stepCount])

  if (!scanId) {
    return (
      <div className="mx-auto max-w-3xl space-y-2">
        <h1 className="text-xl font-semibold">Missing Scan ID</h1>
        <p className="text-sm text-muted-foreground">
          Please start a scan from the Analyze page.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Scanning…</h1>
          <Badge variant="outline">Scan ID: {scanId?.slice(0, 8)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Status: <span className="font-medium capitalize">{status}</span>
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} />

          <Separator />

          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const state = idx < activeStep ? "done" : idx === activeStep ? "active" : "todo"

              return (
                <div
                  key={step.key}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        state === "done"
                          ? "bg-green-500"
                          : state === "active"
                            ? "bg-blue-500"
                            : "bg-muted"
                      }`}
                    />
                    <div className="text-sm">{step.label}</div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {state === "done" ? "Completed" : state === "active" ? "Running…" : "Queued"}
                  </div>
                </div>
              )
            })}
          </div>

          <Separator />

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            {metaText}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}