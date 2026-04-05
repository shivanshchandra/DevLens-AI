import { Card, CardContent } from "@/components/ui/card"

export function StatHighlightCard({
  label,
  value,
  subtext,
}: {
  label: string
  value: string | number
  subtext?: string
}) {
  return (
    <Card className="rounded-[22px] border-white/10 bg-white/[0.03]">
      <CardContent className="space-y-2 p-5">
        <div className="text-sm font-medium text-zinc-400">{label}</div>
        <div className="text-3xl font-semibold tracking-tight text-white">{value}</div>
        {subtext ? <div className="text-xs text-zinc-500">{subtext}</div> : null}
      </CardContent>
    </Card>
  )
}