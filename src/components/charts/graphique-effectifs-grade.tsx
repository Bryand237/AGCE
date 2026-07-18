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
import { GRADE_FILL } from '@/lib/dashboard-utils'
import { LIBELLES_GRADE, ORDRE_GRADE } from '@/domain/enseignants/grade'

type DonneeGrade = { grade: string; effectif: number }

export function GraphiqueEffectifsParGrade({ donnees }: { donnees: DonneeGrade[] }) {
  const data = ORDRE_GRADE.map((grade) => {
    const ligne = donnees.find((d) => d.grade === grade)
    return {
      grade,
      label: LIBELLES_GRADE[grade] ?? grade,
      effectif: ligne?.effectif ?? 0,
      fill: GRADE_FILL[grade] ?? '#34d399',
    }
  })

  const hasData = data.some((d) => d.effectif > 0)

  if (!hasData) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        Aucune donnée disponible
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
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
