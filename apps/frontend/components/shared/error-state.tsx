import { ReactNode } from "react"
import { AlertCircle } from "lucide-react"

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 text-center">
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-5 w-5 text-red-300" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
      </div>

      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  )
}