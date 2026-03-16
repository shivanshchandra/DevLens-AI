"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

import { SeverityChart } from "@/components/dashboard/severity-chart"
import { LanguageChart } from "@/components/dashboard/language-chart"
import { FindingsTable } from "@/components/dashboard/findings-table"
import type {
  Finding,
  FindingSeverity,
  FindingType,
  ScanResults,
} from "@/lib/api/client"

type Results = ScanResults

type FindingsTableItem = {
  id: string
  type: FindingType
  title: string
  severity: FindingSeverity
  filePath: string
  ruleId?: string
  message: string
}

type MlSummary = {
  predictedDebtLevel?: string
  predictedDebtScore?: number
  predictedRiskLevel?: string
  predictedRiskScore?: number
}

type MlExplanationDetail = {
  title?: string
  narrative?: string
  reasons?: string[]
  drivers?: string[]
}

type MlTopContributingFile = {
  filePath: string
  priorityScore?: number
  estimatedEffort?: string
  recommendedAction?: string
  reasons?: string[]
}

function normalizeFindingsForTable(findings: Finding[]): FindingsTableItem[] {
  return findings.map((finding, index) => ({
    id: finding.id ?? `${finding.type}-${finding.filePath ?? "file"}-${index}`,
    type: finding.type,
    title: finding.title,
    severity: finding.severity,
    filePath: finding.filePath ?? "—",
    ruleId: finding.ruleId,
    message: finding.message ?? "",
  }))
}

function severityCounts(findings: Finding[]) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 }

  for (const f of findings) {
    if (f.severity in counts) {
      counts[f.severity as keyof typeof counts]++
    }
  }

  return counts
}

function formatScore(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—"
  return value.toFixed(2)
}

function normalizeMl(results: Results) {
  const ml = (results as any).ml ?? {}

  const summary: MlSummary | undefined = ml.summary
  const riskPrediction =
    ml.riskPrediction ??
    (summary
      ? {
          level: summary.predictedRiskLevel,
          score: summary.predictedRiskScore,
        }
      : undefined)

  const technicalDebtPrediction =
    ml.technicalDebtPrediction ??
    (summary
      ? {
          level: summary.predictedDebtLevel,
          score: summary.predictedDebtScore,
        }
      : undefined)

  const explanationsRoot = ml.explanations ?? {}

  const riskExplanation: MlExplanationDetail | undefined = explanationsRoot.risk
  const technicalDebtExplanation: MlExplanationDetail | undefined =
    explanationsRoot.technicalDebt

  const topContributingFiles: MlTopContributingFile[] =
    explanationsRoot.topContributingFiles ?? []

  const nextActions: string[] = explanationsRoot.nextActions ?? []

  const summaryText =
    typeof ml.summary === "string"
      ? ml.summary
      : summary
        ? `Predicted risk is ${summary.predictedRiskLevel ?? "unknown"} (${formatScore(
            summary.predictedRiskScore
          )}) and predicted technical debt is ${
            summary.predictedDebtLevel ?? "unknown"
          } (${formatScore(summary.predictedDebtScore)}).`
        : undefined

  return {
    riskPrediction,
    technicalDebtPrediction,
    riskExplanation,
    technicalDebtExplanation,
    topContributingFiles,
    nextActions,
    summaryText,
  }
}

export function ReportView({
  scanId,
  results,
  isPublic,
}: {
  scanId: string
  results: Results
  isPublic?: boolean
}) {
  const safeFindings = results.findings ?? []
  const normalizedFindings = normalizeFindingsForTable(safeFindings)
  const counts = severityCounts(safeFindings)
  const topFindings = normalizedFindings.slice(0, 6)

  const {
    riskPrediction,
    technicalDebtPrediction,
    riskExplanation,
    technicalDebtExplanation,
    topContributingFiles,
    nextActions,
    summaryText,
  } = normalizeMl(results)

  const hasMlInsights =
    !!riskPrediction ||
    !!technicalDebtPrediction ||
    !!summaryText ||
    topContributingFiles.length > 0 ||
    nextActions.length > 0 ||
    !!riskExplanation ||
    !!technicalDebtExplanation

  async function copyShare() {
    const url = `${window.location.origin}/report/public/${scanId}`
    await navigator.clipboard.writeText(url)
    toast({ title: "Share link copied" })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isPublic ? "Public Report" : "Report"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Health score summarizes quality, security, maintainability, and AI-derived risk signals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">Scan {scanId.slice(0, 8)}</Badge>
          {!isPublic && (
            <Button variant="outline" onClick={copyShare}>
              Share
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">{results.healthScore}</div>
            <div className="text-sm text-muted-foreground">Grade: {results.grade}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{results.subScores.quality}</div>
            <div className="text-sm text-muted-foreground">Sub-score</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{results.subScores.security}</div>
            <div className="text-sm text-muted-foreground">Sub-score</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintainability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{results.subScores.maintainability}</div>
            <div className="text-sm text-muted-foreground">Sub-score</div>
          </CardContent>
        </Card>
      </div>

      {hasMlInsights && (
        <>
          <Separator />

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">AI Insights</h2>
              <p className="text-sm text-muted-foreground">
                ML-assisted predictions and explanations generated from scan signals.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Predicted Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {riskPrediction?.level ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Score: {formatScore(riskPrediction?.score)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Predicted Debt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-3xl font-semibold">
                    {technicalDebtPrediction?.level ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Score: {formatScore(technicalDebtPrediction?.score)}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>AI Summary</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {summaryText ?? "No AI summary available for this scan."}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{riskExplanation?.title ?? "Risk Explanation"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {riskExplanation?.narrative ?? "No risk explanation available."}
                  </p>

                  {!!riskExplanation?.reasons?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Reasons</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {riskExplanation.reasons.map((reason, index) => (
                          <li key={`${reason}-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!riskExplanation?.drivers?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Drivers</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {riskExplanation.drivers.map((driver, index) => (
                          <li key={`${driver}-${index}`}>{driver}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {technicalDebtExplanation?.title ?? "Technical Debt Explanation"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {technicalDebtExplanation?.narrative ??
                      "No technical debt explanation available."}
                  </p>

                  {!!technicalDebtExplanation?.reasons?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Reasons</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {technicalDebtExplanation.reasons.map((reason, index) => (
                          <li key={`${reason}-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!technicalDebtExplanation?.drivers?.length && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Drivers</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {technicalDebtExplanation.drivers.map((driver, index) => (
                          <li key={`${driver}-${index}`}>{driver}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Contributing Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topContributingFiles.length ? (
                    topContributingFiles.map((file, index) => (
                      <div
                        key={`${file.filePath}-${index}`}
                        className="space-y-2 rounded-md border px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-mono text-xs break-all">{file.filePath}</div>
                          <Badge variant="outline">
                            {typeof file.priorityScore === "number"
                              ? file.priorityScore.toFixed(0)
                              : "N/A"}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Effort: {file.estimatedEffort ?? "N/A"}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Action: {file.recommendedAction ?? "No action suggested."}
                        </div>

                        {!!file.reasons?.length && (
                          <ul className="list-disc pl-5 text-sm text-muted-foreground">
                            {file.reasons.map((reason, reasonIndex) => (
                              <li key={`${file.filePath}-reason-${reasonIndex}`}>{reason}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No contributing file insights available.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {nextActions.length ? (
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {nextActions.map((action, index) => (
                        <li key={`${action}-${index}`}>{action}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No next actions generated for this scan.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <Separator />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="complexity">Complexity</TabsTrigger>
          <TabsTrigger value="fixes">Fixes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Findings by severity</CardTitle>
              </CardHeader>
              <CardContent>
                <SeverityChart counts={counts as any} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <LanguageChart
                  languages={Object.entries(results.metrics.languages).map(([name, percent]) => ({
                    name,
                    percent,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable findings={topFindings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable
                findings={normalizedFindings.filter((f) => f.type === "quality")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable
                findings={normalizedFindings.filter((f) => f.type === "security")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complexity" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complexity hotspots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.metrics.complexityHotspots.map((h: any, i: number) => (
                <div
                  key={`${h.filePath}-${h.score}-${i}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="font-mono text-xs">{h.filePath}</div>
                  <div className="text-sm font-semibold">{h.score}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complexity findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable
                findings={normalizedFindings.filter((f) => f.type === "complexity")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fixes" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suggested quick wins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5">
                <li>Upgrade vulnerable dependencies and lock versions.</li>
                <li>Split high-complexity functions into smaller units.</li>
                <li>Add validation + error boundaries for forms.</li>
                <li>Introduce consistent naming + shared constants.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top refactor targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.metrics.complexityHotspots.slice(0, 3).map((h: any, i: number) => (
                <div
                  key={`${h.filePath}-${h.score}-${i}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{i + 1}</Badge>
                    <div className="font-mono text-xs">{h.filePath}</div>
                  </div>
                  <div className="text-sm font-semibold">{h.score}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}