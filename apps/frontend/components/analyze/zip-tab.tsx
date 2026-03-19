"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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
          {loading ? "Uploading…" : "Analyze ZIP"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Upload a ZIP archive of your project to run a full codebase scan.
        </p>
      </div>
    </div>
  )
}