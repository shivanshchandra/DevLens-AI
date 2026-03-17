"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createScan } from "@/lib/api/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function isValidUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function PrTab() {
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState("")
  const [prNumber, setPrNumber] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const prAsNumber = Number(prNumber)
  const canSubmit =
    isValidUrl(repoUrl) && Number.isInteger(prAsNumber) && prAsNumber > 0 && !loading

  async function onSubmit() {
    setError(null)

    if (!isValidUrl(repoUrl)) {
      setError("Please enter a valid repository URL.")
      return
    }

    if (!Number.isInteger(prAsNumber) || prAsNumber <= 0) {
      setError("PR number must be a positive integer.")
      return
    }

    setLoading(true)
    try {
      const scan = await createScan({
        source_type: "pr",
        repo_url: repoUrl,
        pr_number: prAsNumber,
      })

      router.push(`/scanning/${scan.id}`)
    } catch (e: any) {
      setError(e?.message ?? "Failed to start PR scan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2)">
        <div className="space-y-2">
          <Label htmlFor="repoUrl">Repository URL</Label>
          <Input
            id="repoUrl"
            placeholder="https://github.com/org/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pr">Pull Request #</Label>
          <Input
            id="pr"
            placeholder="e.g. 128"
            value={prNumber}
            onChange={(e) => setPrNumber(e.target.value)}
            inputMode="numeric"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button onClick={onSubmit} disabled={!canSubmit}>
          {loading ? "Starting…" : "Analyze Pull Request"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Starts a real PR scan focused on changed files for faster review.
        </p>
      </div>
    </div>
  )
}