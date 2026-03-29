import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TeamLatestCompletedScan,
  TeamRepoRiskItem,
} from "@/lib/api/client"

function formatNumber(value: number | null, digits = 2) {
  if (value === null || value === undefined) return "—"
  return value.toFixed(digits)
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function gradeVariant(grade: string | null) {
  if (grade === "A") return "outline"
  if (grade === "B") return "secondary"
  if (grade === "C") return "secondary"
  if (grade === "D" || grade === "F") return "destructive"
  return "outline"
}

function riskVariant(level: string | null) {
  const value = (level ?? "").toLowerCase()
  if (value === "critical" || value === "high") return "destructive"
  if (value === "medium") return "secondary"
  return "outline"
}

export function TeamRiskTable({
  topRiskyRepos,
  latestCompletedScans,
}: {
  topRiskyRepos: TeamRepoRiskItem[]
  latestCompletedScans: TeamLatestCompletedScan[]
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top risky repositories</CardTitle>
        </CardHeader>
        <CardContent>
          {topRiskyRepos.length === 0 ? (
            <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
              No repository analytics available yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Scans</TableHead>
                  <TableHead>Avg health</TableHead>
                  <TableHead>Avg risk</TableHead>
                  <TableHead>Avg debt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRiskyRepos.map((repo) => (
                  <TableRow key={repo.repo_key}>
                    <TableCell className="font-medium">{repo.repo_label}</TableCell>
                    <TableCell>{repo.completed_scans}</TableCell>
                    <TableCell>{formatNumber(repo.average_health_score)}</TableCell>
                    <TableCell>{formatNumber(repo.average_predicted_risk_score)}</TableCell>
                    <TableCell>{formatNumber(repo.average_predicted_debt_score)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest completed scans</CardTitle>
        </CardHeader>
        <CardContent>
          {latestCompletedScans.length === 0 ? (
            <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
              No completed scans available yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestCompletedScans.map((scan) => (
                  <TableRow key={scan.scan_id}>
                    <TableCell className="font-medium">{scan.repo_label}</TableCell>
                    <TableCell>
                      <Badge variant={gradeVariant(scan.grade) as any}>
                        {scan.grade ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={riskVariant(scan.predicted_risk_level) as any}>
                        {scan.predicted_risk_level ?? "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(scan.health_score)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(scan.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}