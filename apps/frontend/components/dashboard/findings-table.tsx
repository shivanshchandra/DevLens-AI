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

export function FindingsTable({ findings }: { findings: Finding[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>File</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.map((f) => (
          <TableRow key={f.id}>
            <TableCell>
              <Badge variant={severityVariant(f.severity) as any}>{f.severity}</Badge>
            </TableCell>
            <TableCell className="capitalize">{f.type}</TableCell>
            <TableCell>{f.title}</TableCell>
            <TableCell className="font-mono text-xs">{f.filePath}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}