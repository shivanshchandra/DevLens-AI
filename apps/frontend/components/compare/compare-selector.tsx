"use client"

import type { ScanRecord } from "@/lib/api/client"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CompareSelectorProps = {
  scans: ScanRecord[]
  draftA: string
  draftB: string
  setDraftA: (value: string) => void
  setDraftB: (value: string) => void
  onCompare: () => void
  disabled?: boolean
}

function formatScanLabel(scan: ScanRecord) {
  const sourceLabel = scan.source_type.toUpperCase()
  const repoLabel = scan.repo_url
    ? scan.repo_url.replace(/^https?:\/\//, "")
    : "ZIP upload"

  const createdLabel = new Date(scan.created_at).toLocaleString()

  return `${sourceLabel} • ${repoLabel} • ${createdLabel}`
}

export function CompareSelector({
  scans,
  draftA,
  draftB,
  setDraftA,
  setDraftB,
  onCompare,
  disabled = false,
}: CompareSelectorProps) {
  const selectedBase = scans.find((scan) => scan.id === draftA) ?? null
  const selectedTarget = scans.find((scan) => scan.id === draftB) ?? null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="base-scan-select">Base scan from list</Label>
          <select
            id="base-scan-select"
            value={draftA}
            onChange={(e) => setDraftA(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select base scan</option>
            {scans
              .filter((scan) => scan.id !== draftB)
              .map((scan) => (
                <option key={scan.id} value={scan.id}>
                  {formatScanLabel(scan)}
                </option>
              ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Pick the baseline scan from the completed scan list.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-scan-select">Target scan from list</Label>
          <select
            id="target-scan-select"
            value={draftB}
            onChange={(e) => setDraftB(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select target scan</option>
            {scans
              .filter((scan) => scan.id !== draftA)
              .map((scan) => (
                <option key={scan.id} value={scan.id}>
                  {formatScanLabel(scan)}
                </option>
              ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Pick the newer or alternate scan to compare against the base.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="base-scan-id">Or paste base scan ID manually</Label>
          <Input
            id="base-scan-id"
            value={draftA}
            onChange={(e) => setDraftA(e.target.value.trim())}
            placeholder="e.g. adae52cf-6c16-40d5-ab3f-371406d00b1b"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-scan-id">Or paste target scan ID manually</Label>
          <Input
            id="target-scan-id"
            value={draftB}
            onChange={(e) => setDraftB(e.target.value.trim())}
            placeholder="e.g. 9dd2e2e6-e0c3-49c7-b477-4f28d8663d03"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border p-3 text-sm">
          <div className="font-medium">Base scan</div>
          <div className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {draftA || "No base scan selected"}
          </div>
          {selectedBase ? (
            <div className="mt-2 space-y-1 text-muted-foreground">
              <div>{selectedBase.repo_url ?? "ZIP upload"}</div>
              <div>
                {selectedBase.source_type.toUpperCase()} •{" "}
                {new Date(selectedBase.created_at).toLocaleString()}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border p-3 text-sm">
          <div className="font-medium">Target scan</div>
          <div className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {draftB || "No target scan selected"}
          </div>
          {selectedTarget ? (
            <div className="mt-2 space-y-1 text-muted-foreground">
              <div>{selectedTarget.repo_url ?? "ZIP upload"}</div>
              <div>
                {selectedTarget.source_type.toUpperCase()} •{" "}
                {new Date(selectedTarget.created_at).toLocaleString()}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onCompare}
          disabled={disabled || !draftA || !draftB || draftA === draftB}
        >
          Compare scans
        </Button>

        {draftA && draftB && draftA === draftB ? (
          <p className="text-sm text-destructive">
            Base scan and target scan must be different.
          </p>
        ) : null}
      </div>
    </div>
  )
}