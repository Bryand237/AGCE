'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type DonneeEffectif = { nom: string; masculin: number; feminin: number }

const COULEURS = {
  masculin: '#059669',
  feminin: '#2dd4bf',
} as const

export function GraphiqueEffectifsParSexe({ donnees }: { donnees: DonneeEffectif[] }) {
  const hasData = donnees.some((d) => d.masculin + d.feminin > 0)

  if (!hasData) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        Aucune donnée disponible
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={donnees} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="nom" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="square" />
        <Bar
          dataKey="masculin"
          stackId="effectif"
          name="Masculin"
          fill={COULEURS.masculin}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="feminin"
          stackId="effectif"
          name="Féminin"
          fill={COULEURS.feminin}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
