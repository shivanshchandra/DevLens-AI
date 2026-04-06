"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  FolderGit2,
  GitBranch,
  Hash,
  Loader2,
  Link2,
  ShieldCheck,
} from "lucide-react"

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

  const trimmedRepoUrl = repoUrl.trim()
  const trimmedBranch = branch.trim()
  const trimmedCommit = commit.trim()

  const repoUrlLooksValid = useMemo(
    () => (trimmedRepoUrl ? isValidUrl(trimmedRepoUrl) : false),
    [trimmedRepoUrl]
  )

  const canSubmit = repoUrlLooksValid && !loading

  async function onSubmit() {
    setError(null)

    if (!repoUrlLooksValid) {
      setError("Please enter a valid GitHub repository URL.")
      return
    }

    setLoading(true)
    try {
      const scan = await createScan({
        source_type: "github",
        repo_url: trimmedRepoUrl,
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
            Run a full codebase scan to generate health scores, findings, architecture
            signals, ML predictions, and grounded AI guidance.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            Coverage
          </div>
          <div className="text-sm font-medium text-zinc-200">Full repository scan</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            Output
          </div>
          <div className="text-sm font-medium text-zinc-200">Dashboard + AI insights</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            Next step
          </div>
          <div className="text-sm font-medium text-zinc-200">Live scan progress</div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="repoUrl">GitHub repository URL</Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              id="repoUrl"
              placeholder="https://github.com/vercel/next.js"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="pl-10"
            />
          </div>
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
              Kept here for future targeting support. Current flow starts the standard repo scan.
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
              Kept visible for future commit-specific scans. Current scan uses repository URL.
            </p>
          </div>
        </div>

        {!repoUrlLooksValid && trimmedRepoUrl ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            The repository URL does not look valid yet.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
            <ShieldCheck className="h-4 w-4" />
            What happens next
          </div>
          <p className="text-sm leading-6 text-zinc-400">
            After you start the scan, DevLens redirects you to the live scanning page where
            progress, stages, and final dashboard handoff are tracked automatically.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-zinc-400">
            Starts a live repository scan and redirects you to the scanning workflow.
          </p>

          <Button onClick={onSubmit} disabled={!canSubmit} size="xl">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting scan...
              </>
            ) : (
              <>
                Analyze Repository
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {(trimmedBranch || trimmedCommit) && (
          <p className="text-xs leading-5 text-zinc-500">
            Note: branch and commit inputs are currently kept for UX continuity, but this
            version still starts the standard repository scan request.
          </p>
        )}
      </div>
    </div>
  )
}