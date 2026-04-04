import { Card, CardContent } from "@/components/ui/card"
import { StatusPill } from "@/components/dashboard/status-pill"

type SummaryItem = {
  label: string
  value: string | number
  tone?: "neutral" | "success" | "warning" | "danger" | "info"
}

export function ScanSummaryBar({
  items,
}: {
  items: SummaryItem[]
}) {
  return (
    <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
      <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.label}
            className="space-y-2 rounded-[18px] border border-white/6 bg-black/20 p-4"
          >
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              {item.label}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-white">{item.value}</div>
              <StatusPill label={String(item.value)} tone={item.tone ?? "neutral"} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}