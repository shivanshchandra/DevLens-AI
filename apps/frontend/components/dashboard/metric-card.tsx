import { Card, CardContent } from "@/components/ui/card"
import { StatusPill } from "@/components/dashboard/status-pill"

type MetricCardProps = {
  label: string
  value: string | number
  hint?: string
  accent?: "neutral" | "success" | "warning" | "danger" | "info"
  badge?: string
  badgeTone?: "neutral" | "success" | "warning" | "danger" | "info"
}

function accentClasses(accent: NonNullable<MetricCardProps["accent"]>) {
  switch (accent) {
    case "success":
      return "from-emerald-500/10 to-transparent"
    case "warning":
      return "from-amber-500/10 to-transparent"
    case "danger":
      return "from-red-500/10 to-transparent"
    case "info":
      return "from-sky-500/10 to-transparent"
    case "neutral":
    default:
      return "from-white/5 to-transparent"
  }
}

export function MetricCard({
  label,
  value,
  hint,
  accent = "neutral",
  badge,
  badgeTone = "neutral",
}: MetricCardProps) {
  return (
    <Card className="overflow-hidden rounded-[24px] border-white/10 bg-zinc-950/60 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className={`h-1 w-full bg-gradient-to-r ${accentClasses(accent)}`} />
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-medium text-zinc-400">{label}</div>
          {badge ? <StatusPill label={badge} tone={badgeTone} /> : null}
        </div>

        <div className="space-y-1">
          <div className="text-3xl font-semibold tracking-tight text-white">{value}</div>
          {hint ? <div className="text-xs text-zinc-500">{hint}</div> : null}
        </div>
      </CardContent>
    </Card>
  )
}