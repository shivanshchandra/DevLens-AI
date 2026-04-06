import { Card, CardContent } from "@/components/ui/card"
import { ReactNode } from "react"
import { Sparkles } from "lucide-react"

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="rounded-[28px] border border-white/10 bg-white/[0.02]">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Sparkles className="h-5 w-5 text-zinc-300" />
        </div>

        <div className="space-y-1">
          <div className="text-lg font-semibold text-white">{title}</div>
          <p className="text-sm text-zinc-400 max-w-md">{description}</p>
        </div>

        {action ? <div className="pt-2">{action}</div> : null}
      </CardContent>
    </Card>
  )
}