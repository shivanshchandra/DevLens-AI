import { Card, CardContent } from "@/components/ui/card"
import { StatusPill } from "@/components/dashboard/status-pill"

export function AiSummaryCard({
  summary,
  highlights,
}: {
  summary?: string
  highlights?: string[]
}) {
  return (
    <Card className="rounded-[28px] border-white/10 bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(255,255,255,0.02))]">
      <CardContent className="space-y-5 p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-200">AI Executive Summary</div>
            <div className="text-sm text-zinc-400">
              Grounded summary based on findings, ML signals, and architecture pressure.
            </div>
          </div>

          <StatusPill label="Grounded AI" tone="info" />
        </div>

        <p className="text-sm leading-7 text-zinc-200 md:text-[15px]">
          {summary ?? "No grounded AI summary is available for this scan yet."}
        </p>

        {highlights?.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {highlights.slice(0, 3).map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-zinc-300"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}