import { Card, CardContent } from "@/components/ui/card"
import { StatusPill } from "@/components/dashboard/status-pill"

export function TopRisksCard({
  title = "Top Risks",
  items,
  level,
}: {
  title?: string
  items: string[]
  level?: string | null
}) {
  return (
    <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-white">{title}</div>
            <div className="text-sm text-zinc-400">
              Highest-priority signals surfaced from the current scan.
            </div>
          </div>

          {level ? <StatusPill label={level} /> : null}
        </div>

        {items.length ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
              >
                {item}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-500">
            No major risk bullets were generated for this scan.
          </div>
        )}
      </CardContent>
    </Card>
  )
}