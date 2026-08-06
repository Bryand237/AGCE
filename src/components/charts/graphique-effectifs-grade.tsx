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
import { CHART_PALETTE } from '@/lib/chart-palette'
import { GRADE_FILL } from '@/lib/dashboard-utils'

const DEFAULT_FILL = '#1B4965'

function couleurParIndex(index: number) {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

type DonneeGrade = { grade: string; effectif: number }

export function GraphiqueEffectifsParGrade({ donnees }: { donnees: DonneeGrade[] }) {
  const data = donnees.map((donnee, index) => ({
    grade: donnee.grade,
    label: donnee.grade,
    effectif: donnee.effectif,
    fill:
      GRADE_FILL[donnee.grade as keyof typeof GRADE_FILL] ?? couleurParIndex(index) ?? DEFAULT_FILL,
  }))

  const hasData = data.some((d) => d.effectif > 0)

  if (!hasData) {
    return (
      <div className="border-border bg-muted/30 text-muted-foreground flex h-[280px] items-center justify-center rounded-xl border border-dashed text-sm">
        Aucune donnée disponible
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
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
        <Bar dataKey="effectif" radius={[0, 4, 4, 0]} barSize={24}>
          {data.map((entry) => (
            <Cell key={entry.grade} fill={entry.fill} />
          ))}
          <LabelList
            dataKey="effectif"
            position="right"
            className="fill-foreground text-xs font-medium"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
