"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createScan } from "@/lib/api/client"

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
      const scan = await createScan({
        source_type: "zip",
        repo_url: null,
        pr_number: null,
      })

      router.push(`/scanning/${scan.id}`)
    } catch (e: any) {
      setError(e?.message ?? "Failed to start ZIP scan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="zip">Upload ZIP</Label>
        <Input
          id="zip"
          type="file"
          accept=".zip"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSubmit} disabled={!canSubmit}>
          {loading ? "Starting…" : "Analyze ZIP"}
        </Button>
        <p className="text-xs text-muted-foreground">
          ZIP scan record creation is wired. If file upload is not yet connected in the API flow,
          this mode may still need backend/frontend upload completion.
        </p>
      </div>
    </div>
  )
}