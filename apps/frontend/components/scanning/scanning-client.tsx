"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

import { getScan } from "@/lib/api/client"

const STEPS = [
  { key: "queued", label: "Queued" },
  { key: "preparing", label: "Preparing scan" },
  { key: "fetching_source", label: "Fetching source" },
  { key: "dependency_security", label: "Security & dependencies" },
  { key: "complexity_findings", label: "Complexity & findings" },
  { key: "ml_scoring", label: "ML scoring" },
  { key: "report_building", label: "Building report" },
  { key: "completed", label: "Completed" },
] as const

type ScanStatus = "queued" | "running" | "completed" | "failed"

function statusVariant(status: ScanStatus) {
  if (status === "failed") return "destructive"
  if (status === "running") return "secondary"
  return "outline"
}

function buildMetaText(scan: {
  source_type: "github" | "zip" | "pr"
  repo_url: string | null
  pr_number: number | null
}) {
  if (scan.source_type === "github") {
    return `Repository scan: ${scan.repo_url ?? "Unknown repository"}`
  }

  if (scan.source_type === "pr") {
    return `Pull request scan: ${scan.repo_url ?? "Unknown repository"} #${scan.pr_number ?? "?"}`
  }

  return "ZIP scan: source uploaded for analysis."
}

function deriveActiveStep(currentStep: string, status: ScanStatus) {
  if (status === "failed") {
    const idx = STEPS.findIndex((step) => step.key === currentStep)
    return idx >= 0 ? idx : 0
  }

  if (status === "completed") {
    return STEPS.findIndex((step) => step.key === "completed")
  }

  const idx = STEPS.findIndex((step) => step.key === currentStep)
  return idx >= 0 ? idx : 0
}

export function ScanningClient({ scanId }: { scanId: string }) {
  const router = useRouter()

  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<ScanStatus>("queued")
  const [currentStep, setCurrentStep] = useState("queued")
  const [statusMessage, setStatusMessage] = useState("Loading scan info…")
  const [metaText, setMetaText] = useState<string>("Loading scan info…")
  const [error, setError] = useState<string | null>(null)

  const activeStep = useMemo(
    () => deriveActiveStep(currentStep, status),
    [currentStep, status]
  )

  useEffect(() => {
    if (!scanId) return

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function poll() {
      try {
        const scan = await getScan(scanId)
        if (cancelled) return

        setStatus(scan.status)
        setProgress(scan.progress ?? 0)
        setCurrentStep(scan.current_step ?? "queued")
        setStatusMessage(scan.status_message ?? "Processing scan...")
        setMetaText(buildMetaText(scan))
        setError(scan.status === "failed" ? scan.error_message ?? "Scan failed." : null)

        if (scan.status === "completed") {
          if (intervalId) clearInterval(intervalId)

          setTimeout(() => {
            if (!cancelled) {
              router.push(`/dashboard/${scanId}`)
            }
          }, 500)
        }

        if (scan.status === "failed" && intervalId) {
          clearInterval(intervalId)
        }
      } catch (e: any) {
        if (cancelled) return
        setError((prev) => prev ?? e?.message ?? "Failed to fetch scan status.")
      }
    }

    poll()
    intervalId = setInterval(poll, 1500)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [router, scanId])

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
          <h1 className="text-2xl font-semibold tracking-tight">
            {status === "completed"
              ? "Scan complete"
              : status === "failed"
                ? "Scan failed"
                : "Scanning…"}
          </h1>
          <Badge variant={statusVariant(status) as any}>
            {status === "queued"
              ? "Queued"
              : status === "running"
                ? "Running"
                : status === "completed"
                  ? "Completed"
                  : "Failed"}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Scan ID: <span className="font-mono">{scanId.slice(0, 8)}</span>
        </p>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Progress value={progress} />

          <div className="space-y-1">
            <div className="text-sm font-medium">
              {statusMessage}
            </div>
            <div className="text-xs text-muted-foreground">
              {status === "completed" && "Scan finished successfully. Redirecting to the dashboard…"}
              {status === "failed" && "The scan stopped before completion."}
              {status !== "completed" && status !== "failed" && `Current step: ${currentStep.replace(/_/g, " ")}`}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const state =
                status === "completed"
                  ? "done"
                  : status === "failed" && idx > activeStep
                    ? "todo"
                    : idx < activeStep
                      ? "done"
                      : idx === activeStep
                        ? "active"
                        : "todo"

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
                    {state === "done"
                      ? "Completed"
                      : state === "active"
                        ? status === "failed"
                          ? "Stopped"
                          : "Running…"
                        : "Queued"}
                  </div>
                </div>
              )
            })}
          </div>

          <Separator />

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            {metaText}
          </div>

          {status === "failed" ? (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/analyze")}>
                Start another scan
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}