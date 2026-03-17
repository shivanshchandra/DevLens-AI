"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"

type Scan = {
  id: string
  status: "queued" | "running" | "completed" | "failed"
  created_at: string
  source_type: "github" | "zip" | "pr"
  repo_url: string | null
  pr_number: number | null
}

function statusVariant(status: Scan["status"]) {
  if (status === "failed") return "destructive"
  if (status === "running") return "secondary"
  return "outline"
}

function sourceVariant(sourceType: Scan["source_type"]) {
  if (sourceType === "pr") return "secondary"
  return "outline"
}

function labelForScan(scan: Scan) {
  if (scan.source_type === "github") return scan.repo_url ?? "Repo scan"
  if (scan.source_type === "pr") {
    return `${scan.repo_url ?? "Repo"} #${scan.pr_number ?? "?"}`
  }
  return "ZIP scan"
}

function sourceLabel(sourceType: Scan["source_type"]) {
  if (sourceType === "github") return "Repository"
  if (sourceType === "pr") return "Pull Request"
  return "ZIP Upload"
}

export function HistoryTable({ scans }: { scans: Scan[] }) {
  async function copyShare(scanId: string) {
    const url = `${window.location.origin}/report/public/${scanId}`
    await navigator.clipboard.writeText(url)
    toast({ title: "Share link copied" })
  }

  if (!scans.length) {
    return (
      <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
        No scans available yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Scan ID</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {scans.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <Badge variant={statusVariant(s.status) as any}>{s.status}</Badge>
            </TableCell>

            <TableCell>
              <Badge variant={sourceVariant(s.source_type) as any}>
                {sourceLabel(s.source_type)}
              </Badge>
            </TableCell>

            <TableCell className="max-w-[520px]">
              <div className="truncate font-mono text-xs">{labelForScan(s)}</div>
            </TableCell>

            <TableCell className="text-sm text-muted-foreground">
              {new Date(s.created_at).toLocaleString()}
            </TableCell>

            <TableCell className="font-mono text-xs text-muted-foreground">
              {s.id.slice(0, 8)}
            </TableCell>

            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/${s.id}`}>Open</Link>
                </Button>

                <Button size="sm" variant="outline" onClick={() => copyShare(s.id)}>
                  Share
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}