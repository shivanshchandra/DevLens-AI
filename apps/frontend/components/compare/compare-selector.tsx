"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ScanRecord } from "@/lib/api/client"

function label(scan: ScanRecord) {
  const short = scan.id.slice(0, 8)

  const target =
    scan.source_type === "github"
      ? scan.repo_url ?? "Repository scan"
      : scan.source_type === "pr"
        ? `${scan.repo_url ?? "Repository"} #${scan.pr_number ?? "?"}`
        : "ZIP upload"

  return `${short} • ${target}`
}

export function CompareSelector({
  scans,
  a,
  b,
  setA,
  setB,
}: {
  scans: ScanRecord[]
  a: string
  b: string
  setA: (v: string) => void
  setB: (v: string) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <div className="text-sm font-medium">Scan A</div>
        <Select value={a} onValueChange={setA}>
          <SelectTrigger>
            <SelectValue placeholder="Select scan A" />
          </SelectTrigger>
          <SelectContent>
            {scans.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {label(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Scan B</div>
        <Select value={b} onValueChange={setB}>
          <SelectTrigger>
            <SelectValue placeholder="Select scan B" />
          </SelectTrigger>
          <SelectContent>
            {scans.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {label(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}