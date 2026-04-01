"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  ScanLine,
  ShieldCheck,
} from "lucide-react"

import { getScan } from "@/lib/api/client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const STEPS = [
  { key: "queued", label: "Queued", detail: "Waiting for worker assignment." },
  { key: "preparing", label: "Preparing scan", detail: "Initializing scan context." },
  { key: "fetching_source", label: "Fetching source", detail: "Cloning repo or extracting ZIP." },
  {
    key: "dependency_security",
    label: "Security & dependencies",
    detail: "Checking dependencies and security signals.",
  },
  {
    key: "complexity_findings",
    label: "Complexity & findings",
    detail: "Analyzing findings, complexity, and risky patterns.",
  },
  { key: "ml_scoring", label: "ML scoring", detail: "Generating ML risk and debt signals." },
  { key: "report_building", label: "Building report", detail: "Assembling final report output." },
  { key: "completed", label: "Completed", detail: "Scan finished successfully." },
] as const

type ScanStatus = "queued" | "running" | "completed" | "failed"

function statusVariant(status: ScanStatus) {
  if (status === "failed") return "destructive"
  if (status === "running") return "secondary"
  if (status === "completed") return "success"
  return "outline"
}

function statusLabel(status: ScanStatus) {
  if (status === "queued") return "Queued"
  if (status === "running") return "Running"
  if (status === "completed") return "Completed"
  return "Failed"
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
  const [statusMessage, setStatusMessage] = useState("Loading scan info...")
  const [metaText, setMetaText] = useState<string>("Loading scan info...")
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const activeStep = useMemo(
    () => deriveActiveStep(currentStep, status),
    [currentStep, status]
  )

  useEffect(() => {
    if (!scanId) return

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null
    let redirectTimeout: ReturnType<typeof setTimeout> | null = null

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
          setRedirecting(true)

          redirectTimeout = setTimeout(() => {
            if (!cancelled) {
              router.push(`/dashboard/${scanId}`)
            }
          }, 1200)
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
      if (redirectTimeout) clearTimeout(redirectTimeout)
    }
  }, [router, scanId])

  if (!scanId) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/10 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing scan ID</AlertTitle>
          <AlertDescription>
            Please start a new scan from the Analyze page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-premium-grid bg-white/[0.02] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:px-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_25%)] pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <ScanLine className="h-3.5 w-3.5" />
              Live scan progress
            </div>

            <h1 className="text-gradient-premium text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {status === "completed"
                ? "Scan completed successfully."
                : status === "failed"
                  ? "Scan could not be completed."
                  : "Your scan is in progress."}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              {status === "completed"
                ? "Your report is ready. Redirecting you to the dashboard now."
                : status === "failed"
                  ? "The scan stopped before the report was finished. You can review the error and try again."
                  : "We’re fetching source code, running analysis, generating scores, and assembling your final report."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400">
                Scan ID: <span className="font-mono text-zinc-300">{scanId.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Progress</div>
              <div className="text-2xl font-semibold text-white">{progress}%</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Current stage</div>
              <div className="text-sm font-medium text-zinc-200">
                {currentStep.replace(/_/g, " ")}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Flow</div>
              <div className="text-sm font-medium text-zinc-200">
                {status === "completed" ? "Opening dashboard" : "Building report"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <Alert
          variant="destructive"
          className="rounded-[24px] border-red-500/20 bg-red-500/10 text-red-200"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scan error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Card className="rounded-[28px]">
          <CardHeader className="pb-4">
            <CardTitle className="text-white">Scan progress</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="font-medium text-zinc-200">{statusMessage}</div>
                <div className="text-zinc-500">{progress}%</div>
              </div>

              <Progress value={progress} className="h-3" />

              <p className="text-sm leading-6 text-zinc-400">
                {status === "completed" && "Scan finished successfully. Redirecting to the dashboard..."}
                {status === "failed" && "The scan stopped before completion."}
                {status !== "completed" && status !== "failed" && `Current step: ${currentStep.replace(/_/g, " ")}`}
              </p>
            </div>

            <div className="space-y-3">
              {STEPS.map((step, idx) => {
                const state =
                  status === "completed"
                    ? "done"
                    : status === "failed" && idx > activeStep
                      ? "todo"
                      : idx < activeStep
                        ? "done"
                        : idx === activeStep
                          ? status === "failed"
                            ? "stopped"
                            : "active"
                          : "todo"

                return (
                  <div
                    key={step.key}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={[
                          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border",
                          state === "done"
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                            : state === "active"
                              ? "border-blue-500/30 bg-blue-500/15 text-blue-300"
                              : state === "stopped"
                                ? "border-red-500/30 bg-red-500/15 text-red-300"
                                : "border-white/10 bg-white/[0.03] text-zinc-500",
                        ].join(" ")}
                      >
                        {state === "done" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : state === "active" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : state === "stopped" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Clock3 className="h-4 w-4" />
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-medium text-white">{step.label}</div>
                        <div className="mt-1 text-xs leading-5 text-zinc-500">{step.detail}</div>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-500 sm:pt-1">
                      {state === "done"
                        ? "Completed"
                        : state === "active"
                          ? "Running..."
                          : state === "stopped"
                            ? "Stopped"
                            : "Queued"}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[28px]">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Scan context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-400">
                {metaText}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <ShieldCheck className="h-4 w-4" />
                  What happens during scanning
                </div>
                <p className="text-sm leading-6 text-zinc-400">
                  DevLens runs staged analysis across source retrieval, security and dependency checks,
                  complexity analysis, risk signals, ML scoring, and final report assembly.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === "completed" ? (
                <Button className="w-full" asChild>
                  <Link href={`/dashboard/${scanId}`}>
                    Open dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}

              {status === "failed" ? (
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/analyze">Start another scan</Link>
                </Button>
              ) : null}

              {(status === "queued" || status === "running") && (
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/history">View scan history</Link>
                </Button>
              )}

              {redirecting ? (
                <p className="text-xs text-zinc-500">
                  Redirecting to your dashboard...
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  You can leave this page and come back later from History.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}