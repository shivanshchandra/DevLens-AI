import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TeamOverviewSummary } from "@/lib/api/client"

function formatMetric(value: number | null, digits = 2) {
  if (value === null || value === undefined) return "—"
  return value.toFixed(digits)
}

export function TeamOverview({
  summary,
}: {
  summary: TeamOverviewSummary
}) {
  const cards = [
    {
      title: "Total scans",
      value: summary.total_scans.toString(),
      subtitle: "All scans in system",
    },
    {
      title: "Completed scans",
      value: summary.completed_scans.toString(),
      subtitle: "Ready for aggregation",
    },
    {
      title: "Average health",
      value: formatMetric(summary.average_health_score),
      subtitle: "Across completed scans",
    },
    {
      title: "Average ML risk",
      value: formatMetric(summary.average_predicted_risk_score),
      subtitle: "Predicted risk score",
    },
    {
      title: "Average ML debt",
      value: formatMetric(summary.average_predicted_debt_score),
      subtitle: "Predicted debt score",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{card.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}