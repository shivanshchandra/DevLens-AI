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

export function RepoTab() {
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("")
  const [commit, setCommit] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = isValidUrl(repoUrl) && !loading

  async function onSubmit() {
    setError(null)

    if (!isValidUrl(repoUrl)) {
      setError("Please enter a valid repository URL.")
      return
    }

    setLoading(true)
    try {
      const scan = await createScan({
        source_type: "github",
        repo_url: repoUrl,
        pr_number: null,
      })

      router.push(`/scanning/${scan.id}`)
    } catch (e: any) {
      setError(e?.message ?? "Failed to start repository scan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="repoUrl">GitHub repository URL</Label>
        <Input
          id="repoUrl"
          placeholder="https://github.com/vercel/next.js"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="branch">Branch (optional)</Label>
          <Input
            id="branch"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="commit">Commit SHA (optional)</Label>
          <Input
            id="commit"
            placeholder="e.g. a1b2c3d"
            value={commit}
            onChange={(e) => setCommit(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSubmit} disabled={!canSubmit}>
          {loading ? "Starting…" : "Analyze Repository"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Starts a real repository scan and sends you to the live scanning workflow.
        </p>
      </div>
    </div>
  )
}