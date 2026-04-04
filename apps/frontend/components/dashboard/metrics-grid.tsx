import { MetricCard } from "@/components/dashboard/metric-card"

type MetricItem = {
  label: string
  value: string | number
  hint?: string
  accent?: "neutral" | "success" | "warning" | "danger" | "info"
  badge?: string
  badgeTone?: "neutral" | "success" | "warning" | "danger" | "info"
}

export function MetricsGrid({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <MetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          accent={item.accent}
          badge={item.badge}
          badgeTone={item.badgeTone}
        />
      ))}
    </div>
  )
}