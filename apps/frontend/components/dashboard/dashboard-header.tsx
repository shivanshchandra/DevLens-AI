"use client"

import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/dashboard/status-pill"

type DashboardHeaderProps = {
  title: string
  description: string
  scanId: string
  isPublic?: boolean
  onShare?: () => void
}

export function DashboardHeader({
  title,
  description,
  scanId,
  isPublic,
  onShare,
}: DashboardHeaderProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.07),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={isPublic ? "Public report" : "Internal report"} tone="info" />
            <StatusPill label={`Scan ${scanId.slice(0, 8)}`} tone="neutral" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
              {description}
            </p>
          </div>
        </div>

        {!isPublic && onShare ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              onClick={onShare}
              className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
            >
              Copy share link
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}