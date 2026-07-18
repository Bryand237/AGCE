'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RepartitionParGrade } from '@/lib/dashboard-utils'

interface ChartRepartitionGradeProps {
  data: RepartitionParGrade[]
  error?: string | null
}

export function ChartRepartitionGrade({ data, error }: ChartRepartitionGradeProps) {
  const hasData = data.some((item) => item.count > 0)

  if (error) {
    return <ChartMessage message={error} variant="error" />
  }

  if (!hasData) {
    return <ChartMessage message="Aucune donnée disponible" />
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          formatter={(value) => [`${value} enseignants`, 'Effectif']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
          {data.map((entry) => (
            <Cell key={entry.grade} fill={entry.fill} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            className="fill-foreground text-xs font-medium"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChartMessage({
  message,
  variant = 'empty',
}: {
  message: string
  variant?: 'empty' | 'error'
}) {
  return (
    <div
      className={`flex h-[320px] items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm ${
        variant === 'error'
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-border bg-muted/30 text-muted-foreground'
      }`}
    >
      {message}
    </div>
  )
}
