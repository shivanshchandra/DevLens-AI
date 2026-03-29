"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from "recharts"

import {
  TeamDistributionItem,
  TeamTrendItem,
} from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function normalizeDistribution(items: TeamDistributionItem[]) {
  return items.map((item) => ({
    name: item.label,
    value: item.count,
  }))
}

export function TeamTrends({
  gradeDistribution,
  riskDistribution,
  trend,
}: {
  gradeDistribution: TeamDistributionItem[]
  riskDistribution: TeamDistributionItem[]
  trend: TeamTrendItem[]
}) {
  const gradeData = normalizeDistribution(gradeDistribution)
  const riskData = normalizeDistribution(riskDistribution)

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Recent scan trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="completed_scans"
                  name="Completed scans"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="average_health_score"
                  name="Avg health"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="average_predicted_risk_score"
                  name="Avg ML risk"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Grade distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gradeData} dataKey="value" nameKey="name" outerRadius={80} label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk level distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}