import { Card, CardContent } from "@/components/ui/card"

export function EmptyStateCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02]">
      <CardContent className="space-y-2 p-6">
        <div className="text-base font-medium text-white">{title}</div>
        <p className="text-sm text-zinc-400">{description}</p>
      </CardContent>
    </Card>
  )
}