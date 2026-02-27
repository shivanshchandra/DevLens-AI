"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

type Severity = "low" | "medium" | "high" | "critical"

export function SeverityChart({
  counts,
}: {
  counts: Record<Severity, number>
}) {
  const data = (["critical", "high", "medium", "low"] as Severity[]).map((s) => ({
    severity: s,
    count: counts[s],
  }))

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="severity" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}