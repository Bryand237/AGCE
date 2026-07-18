'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GRADE_CHART_COLORS, type RepartitionParRegion } from '@/lib/dashboard-utils'

const SERIES = [
  { dataKey: 'professeurs', name: 'Professeurs', fill: GRADE_CHART_COLORS.professeurs },
  {
    dataKey: 'maitreConferences',
    name: 'Maître de conf.',
    fill: GRADE_CHART_COLORS.maitreConferences,
  },
  {
    dataKey: 'chargesCours',
    name: 'Chargés de cours',
    fill: GRADE_CHART_COLORS.chargesCours,
  },
  { dataKey: 'assistants', name: 'Assistants', fill: GRADE_CHART_COLORS.assistants },
] as const

interface ChartParRegionProps {
  data: RepartitionParRegion[]
  error?: string | null
}

export function ChartParRegion({ data, error }: ChartParRegionProps) {
  const hasData = data.some(
    (item) =>
      item.professeurs + item.maitreConferences + item.chargesCours + item.assistants > 0
  )

  if (error) {
    return <ChartMessage message={error} variant="error" />
  }

  if (!hasData) {
    return <ChartMessage message="Aucune donnée disponible" />
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="region"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="square" />
        {SERIES.map((serie) => (
          <Bar
            key={serie.dataKey}
            dataKey={serie.dataKey}
            name={serie.name}
            fill={serie.fill}
            radius={[4, 4, 0, 0]}
          />
        ))}
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
