import { Loader2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export function PageLoadingState({
  title = "Loading...",
  description = "Please wait while we prepare this page.",
}: {
  title?: string
  description?: string
}) {
  return (
    <Card className="rounded-[28px]">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center md:px-10">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-200" />
        </div>

        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}