"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  FileArchive,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react"

import { uploadZipScan } from "@/lib/api/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MAX_MB = 50

export function ZipTab() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = !!file && !loading

  function onPick(f: File | null) {
    setError(null)

    if (!f) {
      setFile(null)
      return
    }

    const isZip = f.name.toLowerCase().endsWith(".zip")
    const sizeMb = f.size / (1024 * 1024)

    if (!isZip) {
      setError("Only .zip files are supported.")
      setFile(null)
      return
    }

    if (sizeMb > MAX_MB) {
      setError(`File is too large. Max allowed is ${MAX_MB}MB.`)
      setFile(null)
      return
    }

    setFile(f)
  }

  async function onSubmit() {
    setError(null)

    if (!file) {
      setError("Please select a ZIP file.")
      return
    }

    setLoading(true)
    try {
      const scan = await uploadZipScan(file)
      router.push(`/scanning/${scan.id}`)
    } catch (e: any) {
      setError(e?.message ?? "Failed to upload ZIP and start scan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
          <FileArchive className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">Upload a ZIP archive</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Analyze a local project archive without connecting directly to a repository.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            Source
          </div>
          <div className="text-sm font-medium text-zinc-200">Local ZIP archive</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            Limit
          </div>
          <div className="text-sm font-medium text-zinc-200">{MAX_MB}MB max size</div>
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
          <Label htmlFor="zip">ZIP file</Label>
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-300">
              <UploadCloud className="h-4 w-4" />
              Upload your project archive
            </div>

            <Input
              id="zip"
              type="file"
              accept=".zip"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Supported format: <span className="text-zinc-300">.zip</span> · Maximum size:{" "}
              <span className="text-zinc-300">{MAX_MB}MB</span>
            </p>
          </div>

          {file ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
              Selected file: <span className="font-medium text-white">{file.name}</span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
            <ShieldCheck className="h-4 w-4" />
            What happens next
          </div>
          <p className="text-sm leading-6 text-zinc-400">
            After upload, DevLens starts processing your archive and redirects you to the
            live scanning workflow automatically.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-zinc-400">
            Upload the archive and continue to the live scanning workflow.
          </p>

          <Button onClick={onSubmit} disabled={!canSubmit} size="xl">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                Analyze ZIP
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}