"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Check, Copy, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react"
import type { AiFixResponse } from "@/lib/api/client"

interface AiFixModalProps {
  isOpen: boolean
  onClose: () => void
  finding: {
    ruleId?: string
    title: string
    message?: string
    filePath?: string
    severity?: string
  } | null
  fixData: AiFixResponse | null
  isLoading: boolean
}

export function AiFixModal({
  isOpen,
  onClose,
  finding,
  fixData,
  isLoading,
}: AiFixModalProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"diff" | "beforeAfter">("diff")

  if (!finding) return null

  function handleCopy() {
    if (fixData?.afterCode || fixData?.gitDiff) {
      navigator.clipboard.writeText(fixData.gitDiff || fixData.afterCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950/95 p-6 backdrop-blur-2xl text-white">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              AI Security Remediation & Patch
            </DialogTitle>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 ml-auto text-xs">
              Gemini 2.5 Flash
            </Badge>
          </div>
          <DialogDescription className="text-zinc-400 text-sm">
            Target: <code className="text-zinc-200 font-mono text-xs">{finding.filePath}</code>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <Sparkles className="h-5 w-5 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Generating secure patch with Gemini...</p>
              <p className="text-xs text-zinc-500">Refactoring AST context and verifying safe replacements</p>
            </div>
          </div>
        ) : fixData ? (
          <div className="space-y-5 pt-2">
            {/* Explanation box */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Remediation Strategy
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {fixData.explanation}
              </p>
              {fixData.safetyImpact && (
                <div className="mt-2 text-xs text-emerald-400/90 bg-emerald-500/10 rounded-lg p-2.5 border border-emerald-500/20">
                  <span className="font-semibold">Safety Impact:</span> {fixData.safetyImpact}
                </div>
              )}
            </div>

            {/* Toggle view tabs */}
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("diff")}
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    activeTab === "diff"
                      ? "bg-white/15 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Unified Git Diff
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("beforeAfter")}
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    activeTab === "beforeAfter"
                      ? "bg-white/15 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Side-by-Side Code
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-xs border-white/10 hover:bg-white/10 text-zinc-200"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied Patch!" : "Copy Diff"}
              </Button>
            </div>

            {/* View contents */}
            {activeTab === "diff" ? (
              <div className="rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs overflow-x-auto max-h-72">
                <pre className="text-zinc-300">
                  {fixData.gitDiff.split("\n").map((line, idx) => {
                    const isAdd = line.startsWith("+")
                    const isDel = line.startsWith("-")
                    const isHeader = line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")
                    return (
                      <div
                        key={idx}
                        className={`leading-5 px-1 rounded ${
                          isAdd
                            ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                            : isDel
                            ? "bg-rose-500/15 text-rose-300 line-through"
                            : isHeader
                            ? "text-cyan-400 font-semibold"
                            : "text-zinc-400"
                        }`}
                      >
                        {line}
                      </div>
                    )
                  })}
                </pre>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-3 space-y-2">
                  <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Before (Vulnerable / Inefficient)
                  </div>
                  <pre className="font-mono text-xs text-rose-200/90 whitespace-pre-wrap overflow-x-auto max-h-60 bg-black/40 p-2.5 rounded-lg border border-rose-500/10">
                    {fixData.beforeCode}
                  </pre>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 space-y-2">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    After (Refactored & Secure)
                  </div>
                  <pre className="font-mono text-xs text-emerald-200/90 whitespace-pre-wrap overflow-x-auto max-h-60 bg-black/40 p-2.5 rounded-lg border border-emerald-500/10">
                    {fixData.afterCode}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-zinc-400">
            Failed to generate fix. Please try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
