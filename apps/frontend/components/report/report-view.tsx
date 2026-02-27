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

type Results = any

function severityCounts(findings: any[]) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const f of findings) counts[f.severity as keyof typeof counts]++
  return counts
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
  const counts = severityCounts(results.findings)
  const topFindings = results.findings.slice(0, 6)

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
            Health score summarizes quality, security, and maintainability signals.
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
                <LanguageChart languages={results.metrics.languages} />
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
              <FindingsTable findings={results.findings.filter((f: any) => f.type === "quality")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable findings={results.findings.filter((f: any) => f.type === "security")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complexity" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complexity hotspots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.metrics.complexityHotspots.map((h: any) => (
                <div
                  key={h.filePath}
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
              <FindingsTable findings={results.findings.filter((f: any) => f.type === "complexity")} />
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
                  key={h.filePath}
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