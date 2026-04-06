import Link from "next/link"
import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type PageErrorStateProps = {
  title?: string
  description: string
  retryLabel?: string
  onRetry?: () => void
  primaryHref?: string
  primaryLabel?: string
}

export function PageErrorState({
  title = "Something went wrong",
  description,
  retryLabel = "Try again",
  onRetry,
  primaryHref,
  primaryLabel,
}: PageErrorStateProps) {
  return (
    <div className="space-y-4">
      <Alert
        variant="destructive"
        className="rounded-[24px] border-red-500/20 bg-red-500/10 text-red-200"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row">
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        ) : null}

        {primaryHref && primaryLabel ? (
          <Button type="button" asChild>
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}