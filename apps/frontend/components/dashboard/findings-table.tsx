import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type Finding = {
  id: string
  type: "security" | "quality" | "complexity" | "dependency" | "risk"
  severity: "low" | "medium" | "high" | "critical"
  title: string
  filePath: string
  message: string
}

function severityVariant(sev: Finding["severity"]) {
  if (sev === "critical") return "destructive"
  if (sev === "high") return "secondary"
  return "outline"
}

function typeVariant(type: Finding["type"]) {
  if (type === "security") return "destructive"
  if (type === "dependency") return "secondary"
  if (type === "risk") return "secondary"
  return "outline"
}

function formatType(type: Finding["type"]) {
  if (type === "dependency") return "Dependency"
  if (type === "quality") return "Quality"
  if (type === "complexity") return "Complexity"
  if (type === "security") return "Security"
  if (type === "risk") return "Risk"
  return type
}

export function FindingsTable({ findings }: { findings: Finding[] }) {
  if (!findings.length) {
    return (
      <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
        No findings available.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Finding</TableHead>
          <TableHead>File</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {findings.map((f) => (
          <TableRow key={f.id}>
            <TableCell>
              <Badge variant={severityVariant(f.severity) as any}>{f.severity}</Badge>
            </TableCell>

            <TableCell>
              <Badge variant={typeVariant(f.type) as any}>{formatType(f.type)}</Badge>
            </TableCell>

            <TableCell className="space-y-1">
              <div className="font-medium">{f.title}</div>
              {f.message ? (
                <div className="text-xs text-muted-foreground">{f.message}</div>
              ) : null}
            </TableCell>

            <TableCell className="font-mono text-xs break-all">{f.filePath}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}