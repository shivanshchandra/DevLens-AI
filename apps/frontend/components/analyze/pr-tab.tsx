"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, GitPullRequest, Hash, Link2 } from "lucide-react"

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
    <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
          <GitPullRequest className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">Review a pull request</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Focus on changed files and detect risky pull request patterns faster.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="repoUrl">Repository URL</Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              id="repoUrl"
              placeholder="https://github.com/org/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            Paste the repository URL that contains the pull request.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pr">Pull Request #</Label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              id="pr"
              placeholder="e.g. 128"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              inputMode="numeric"
              className="pl-10"
            />
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            Enter the PR number to scan only the changed scope.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-zinc-400">
          Starts a focused PR scan for faster code review and risk visibility.
        </p>

        <Button onClick={onSubmit} disabled={!canSubmit} size="xl">
          {loading ? "Starting scan..." : "Analyze Pull Request"}
          {!loading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </div>
    </div>
  )
}