"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, FolderGit2, GitBranch, Hash } from "lucide-react"

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
    <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
          <FolderGit2 className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">Analyze a GitHub repository</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Run a full codebase scan to generate health scores, findings, architecture signals,
            ML predictions, and AI guidance.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="repoUrl">GitHub repository URL</Label>
          <Input
            id="repoUrl"
            placeholder="https://github.com/vercel/next.js"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <p className="text-xs leading-5 text-zinc-500">
            Paste a public GitHub repository URL to begin analysis.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branch">Branch (optional)</Label>
            <div className="relative">
              <GitBranch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="branch"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs leading-5 text-zinc-500">
              Use this when you want to scan a specific branch.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commit">Commit SHA (optional)</Label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="commit"
                placeholder="e.g. a1b2c3d"
                value={commit}
                onChange={(e) => setCommit(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs leading-5 text-zinc-500">
              Useful when you want analysis at a specific commit.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-zinc-400">
            Starts a live repository scan and redirects you to the scanning workflow.
          </p>

          <Button onClick={onSubmit} disabled={!canSubmit} size="xl">
            {loading ? "Starting scan..." : "Analyze Repository"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </div>
      </div>
    </div>
  )
}