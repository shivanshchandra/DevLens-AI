"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Network, AlertTriangle, Layers, ArrowRight, ShieldCheck, Box } from "lucide-react"

interface ArchitectureGraphProps {
  architecture?: any
  fileFeatureSummary?: any
}

export function ArchitectureGraphVisualizer({
  architecture,
  fileFeatureSummary,
}: ArchitectureGraphProps) {
  const summary = architecture?.summary || {}
  const couplingHotspots: any[] = architecture?.couplingHotspots || []
  const dependencyHubs: any[] = architecture?.dependencyHubs || []
  const boundaryWarnings: any[] = architecture?.boundaryWarnings || []
  const smells: any[] = architecture?.smells || []
  const languages: any[] = fileFeatureSummary?.filesByLanguage || []

  const [selectedNode, setSelectedNode] = useState<{
    name: string
    type: "hub" | "coupling" | "boundary" | "module"
    details: string
    risk: "high" | "medium" | "low"
  } | null>(null)

  // Construct visualized module nodes
  const nodes = [
    ...dependencyHubs.slice(0, 4).map((hub, idx) => ({
      id: `hub-${idx}`,
      name: hub.filePath || `Hub-${idx}`,
      type: "hub" as const,
      details: hub.reasons?.[0] || "Critical dependency hub relied upon across modules.",
      risk: "high" as const,
    })),
    ...couplingHotspots.slice(0, 4).map((c, idx) => ({
      id: `coupling-${idx}`,
      name: c.filePath || `Coupled-${idx}`,
      type: "coupling" as const,
      details: c.reasons?.[0] || "Tight coupling hotspot with cross-file dependencies.",
      risk: "medium" as const,
    })),
    ...boundaryWarnings.slice(0, 3).map((b, idx) => ({
      id: `boundary-${idx}`,
      name: `${b.sourceDirectory || "src"} ➔ ${b.targetDirectory || "dest"}`,
      type: "boundary" as const,
      details: b.message || "Boundary breach violating layer separation.",
      risk: "high" as const,
    })),
  ]

  // If repository has no architectural smells, provide a clean architecture visualization
  const isClean = nodes.length === 0

  return (
    <Card className="rounded-[28px] border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Network className="h-3.5 w-3.5" />
              Interactive Architectural Topology
            </div>
            <CardTitle className="text-xl text-white">Dependency & Coupling Mesh</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Real-time map of package boundaries, circular imports, and dependency hubs.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/5">
              Hubs: {summary.dependencyHubs || 0}
            </Badge>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5">
              Coupling: {summary.couplingHotspots || 0}
            </Badge>
            <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/5">
              Smells: {summary.architectureSmells || 0}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Interactive Topology Board */}
        <div className="relative min-h-[280px] rounded-2xl border border-white/10 bg-black/40 p-6 flex flex-col justify-between overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-premium-grid opacity-25 pointer-events-none" />

          {isClean ? (
            <div className="my-auto flex flex-col items-center justify-center text-center py-8 space-y-3 z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-base font-semibold text-white">Clean Architectural Topology</h4>
                <p className="text-xs text-zinc-400">
                  No circular dependencies or god-object coupling hubs were detected. Modules demonstrate clear separation of concerns.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                {languages.slice(0, 4).map((lang: any) => (
                  <Badge key={lang.name} variant="outline" className="text-xs border-white/10 text-zinc-300">
                    {lang.name} ({lang.count} files)
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 z-10">
              {nodes.map((node) => {
                const isSelected = selectedNode?.name === node.name
                const isHub = node.type === "hub"
                const isBoundary = node.type === "boundary"

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-[1.02]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                        {isHub ? (
                          <Box className="h-3.5 w-3.5 text-cyan-400" />
                        ) : isBoundary ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                        ) : (
                          <Layers className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        {node.type.toUpperCase()}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          node.risk === "high" ? "bg-rose-400 animate-pulse" : "bg-amber-400"
                        }`}
                      />
                    </div>
                    <div className="font-mono text-xs font-semibold text-white truncate">
                      {node.name}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                      {node.details}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Node detail drawer */}
          {selectedNode && (
            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5" />
                  Selected Topology Node: <code className="text-white">{selectedNode.name}</code>
                </span>
                <p className="text-zinc-300">{selectedNode.details}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedNode(null)}
                className="text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 shrink-0"
              >
                Close Inspector
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
