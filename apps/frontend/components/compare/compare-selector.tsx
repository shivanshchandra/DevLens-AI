"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Scan = {
  id: string
  createdAt: string
  request?: { mode: "repo" | "zip" | "pr"; payload: any }
}

function label(scan: Scan) {
  const short = scan.id.slice(0, 8)
  const target =
    scan.request?.mode === "repo"
      ? scan.request.payload.repoUrl
      : scan.request?.mode === "pr"
        ? `${scan.request.payload.repoUrl} #${scan.request.payload.prNumber}`
        : scan.request?.mode === "zip"
          ? scan.request.payload.fileName
          : "Unknown"

  return `${short} • ${target}`
}

export function CompareSelector({
  scans,
  a,
  b,
  setA,
  setB,
}: {
  scans: Scan[]
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