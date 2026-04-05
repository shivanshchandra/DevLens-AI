import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type InsightItem = {
  id: string
  title: string
  description?: string
  meta?: string[]
  badge?: string
}

export function InsightListCard({
  title,
  description,
  items,
  emptyText = "No items available.",
}: {
  title: string
  description?: string
  items: InsightItem[]
  emptyText?: string
}) {
  return (
    <Card className="rounded-[24px] border-white/10 bg-white/[0.03]">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">{title}</CardTitle>
        {description ? (
          <p className="text-sm text-zinc-400">{description}</p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="space-y-2 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  {item.description ? (
                    <div className="text-sm text-zinc-400">{item.description}</div>
                  ) : null}
                </div>

                {item.badge ? (
                  <Badge
                    variant="outline"
                    className="border-white/10 bg-white/[0.04] text-zinc-300"
                  >
                    {item.badge}
                  </Badge>
                ) : null}
              </div>

              {item.meta?.length ? (
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                  {item.meta.map((metaItem, index) => (
                    <span key={`${item.id}-meta-${index}`}>{metaItem}</span>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-500">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  )
}