import { Badge } from "@/components/ui/badge"

type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "low"
  | "medium"
  | "high"
  | "critical"

function toneClasses(tone: StatusTone) {
  switch (tone) {
    case "success":
    case "low":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/10"
    case "warning":
    case "medium":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/10"
    case "danger":
    case "high":
    case "critical":
      return "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/10"
    case "info":
      return "border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/10"
    case "neutral":
    default:
      return "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.04]"
  }
}

export function statusToneFromValue(value?: string | null): StatusTone {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (!normalized) return "neutral"

  if (["completed", "healthy", "low", "good", "stable", "a", "b"].includes(normalized)) {
    return "success"
  }

  if (["medium", "moderate", "warning", "pending", "c"].includes(normalized)) {
    return "warning"
  }

  if (
    ["high", "critical", "failed", "severe", "danger", "d", "e", "f", "regressed"].includes(
      normalized
    )
  ) {
    return "danger"
  }

  if (["running", "queued", "info", "processing"].includes(normalized)) {
    return "info"
  }

  return "neutral"
}

export function StatusPill({
  label,
  tone,
  className = "",
}: {
  label: string
  tone?: StatusTone
  className?: string
}) {
  const resolvedTone = tone ?? statusToneFromValue(label)

  return (
    <Badge
      variant="outline"
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${toneClasses(
        resolvedTone
      )} ${className}`}
    >
      {label}
    </Badge>
  )
}