"use client"

import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts"

export function LanguageChart({
  languages,
}: {
  languages: { name: string; percent: number }[]
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={languages} dataKey="percent" nameKey="name" outerRadius={80} label />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}