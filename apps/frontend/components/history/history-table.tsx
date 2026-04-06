"use client"

import Link from "next/link"
import {
  ArrowRight,
  Copy,
  ExternalLink,
  FolderGit2,
  GitPullRequest,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react"

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
  if (status === "completed") return "success"
  if (status === "failed") return "destructive"
  if (status === "running") return "secondary"
  return "outline"
}

function sourceVariant(sourceType: Scan["source_type"]) {
  if (sourceType === "pr") return "secondary"
  return "outline"
}

function labelForScan(scan: Scan) {
  if (scan.source_type === "github") return scan.repo_url ?? "Repository scan"
  if (scan.source_type === "pr") {
    return `${scan.repo_url ?? "Repository"} #${scan.pr_number ?? "?"}`
  }
  return "ZIP upload scan"
}

function sourceLabel(sourceType: Scan["source_type"]) {
  if (sourceType === "github") return "Repository"
  if (sourceType === "pr") return "Pull Request"
  return "ZIP Upload"
}

function statusLabel(status: Scan["status"]) {
  if (status === "queued") return "Queued"
  if (status === "running") return "Running"
  if (status === "completed") return "Completed"
  return "Failed"
}

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString()
}

function scanPrimaryAction(scan: Scan) {
  if (scan.status === "completed") {
    return {
      href: `/dashboard/${scan.id}`,
      label: "Open dashboard",
    }
  }

  if (scan.status === "failed") {
    return {
      href: "/analyze",
      label: "Start new scan",
    }
  }

  return {
    href: `/scanning/${scan.id}`,
    label: "View progress",
  }
}

function SourceIcon({ sourceType }: { sourceType: Scan["source_type"] }) {
  if (sourceType === "github") return <FolderGit2 className="h-4 w-4" />
  if (sourceType === "pr") return <GitPullRequest className="h-4 w-4" />
  return <Upload className="h-4 w-4" />
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
    <div className="overflow-hidden rounded-[28px]">
      <div className="border-b border-white/10 px-5 py-5 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent scans</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Open dashboards for completed scans, continue running scans, or copy public report links.
            </p>
          </div>

          <div className="text-sm text-zinc-500">
            {scans.length} {scans.length === 1 ? "scan" : "scans"}
          </div>
        </div>
      </div>

      <div className="hidden xl:block">
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
            {scans.map((scan) => {
              const primaryAction = scanPrimaryAction(scan)

              return (
                <TableRow key={scan.id}>
                  <TableCell>
                    <Badge variant={statusVariant(scan.status) as any}>
                      {statusLabel(scan.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={sourceVariant(scan.source_type) as any}
                      className="gap-1.5"
                    >
                      <SourceIcon sourceType={scan.source_type} />
                      {sourceLabel(scan.source_type)}
                    </Badge>
                  </TableCell>

                  <TableCell className="max-w-[520px]">
                    <div className="truncate font-mono text-xs text-zinc-300">
                      {labelForScan(scan)}
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-zinc-400">
                    {formatCreatedAt(scan.created_at)}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-zinc-500">
                    {scan.id.slice(0, 8)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={primaryAction.href}>
                          {primaryAction.label}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyShare(scan.id)}
                        disabled={scan.status !== "completed"}
                      >
                        <Copy className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 p-4 xl:hidden md:p-6">
        {scans.map((scan) => {
          const primaryAction = scanPrimaryAction(scan)

          return (
            <div
              key={scan.id}
              className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(scan.status) as any}>
                        {statusLabel(scan.status)}
                      </Badge>

                      <Badge
                        variant={sourceVariant(scan.source_type) as any}
                        className="gap-1.5"
                      >
                        <SourceIcon sourceType={scan.source_type} />
                        {sourceLabel(scan.source_type)}
                      </Badge>
                    </div>

                    <div>
                      <div className="font-mono text-xs text-zinc-300 break-all">
                        {labelForScan(scan)}
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        Scan ID: {scan.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-zinc-400">
                    {formatCreatedAt(scan.created_at)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-400">
                  {scan.status === "completed" &&
                    "This scan is ready to open in the dashboard."}
                  {scan.status === "running" &&
                    "This scan is still in progress. Open the live scanning page to follow progress."}
                  {scan.status === "queued" &&
                    "This scan is queued and waiting to continue processing."}
                  {scan.status === "failed" &&
                    "This scan stopped before completion. Start a new scan to retry the workflow."}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild size="sm" variant="outline">
                    <Link href={primaryAction.href}>
                      {primaryAction.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyShare(scan.id)}
                    disabled={scan.status !== "completed"}
                  >
                    <Copy className="h-4 w-4" />
                    Share public report
                  </Button>

                  {scan.status === "completed" ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/report/public/${scan.id}`}>
                        <ExternalLink className="h-4 w-4" />
                        Open public report
                      </Link>
                    </Button>
                  ) : null}

                  {scan.status === "failed" ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/analyze">
                        <XCircle className="h-4 w-4" />
                        Retry from analyze
                      </Link>
                    </Button>
                  ) : null}

                  {(scan.status === "running" || scan.status === "queued") ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/scanning/${scan.id}`}>
                        <Loader2 className="h-4 w-4" />
                        Live progress
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}