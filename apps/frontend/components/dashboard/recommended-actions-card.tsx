import { Card, CardContent } from "@/components/ui/card"
import { StatusPill } from "@/components/dashboard/status-pill"

export function RecommendedActionsCard({
  title = "Recommended Actions",
  items,
}: {
  title?: string
  items: string[]
}) {
  return (
    <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-white">{title}</div>
            <div className="text-sm text-zinc-400">
              Practical next steps generated from AI plans and remediation suggestions.
            </div>
          </div>

          <StatusPill label="Actionable" tone="success" />
        </div>

        {items.length ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-xs font-semibold text-emerald-300">
                  {index + 1}
                </div>
                <div className="text-sm text-zinc-300">{item}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-500">
            No recommended actions were generated for this scan.
          </div>
        )}
      </CardContent>
    </Card>
  )
}