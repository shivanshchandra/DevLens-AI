import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ReactNode } from "react"

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
    <div className="mx-auto max-w-3xl space-y-4">
      <Alert>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="space-y-3">
          <div>{description}</div>
          {action}
        </AlertDescription>
      </Alert>
    </div>
  )
}