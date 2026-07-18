import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const accentStyles = {
  blue: {
    icon: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-100',
    accent: 'text-emerald-600',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-600',
    border: 'border-emerald-100',
    accent: 'text-emerald-600',
  },
  amber: {
    icon: 'bg-teal-50 text-teal-600',
    border: 'border-teal-100',
    accent: 'text-teal-600',
  },
  rose: {
    icon: 'bg-cyan-50 text-cyan-600',
    border: 'border-cyan-100',
    accent: 'text-cyan-600',
  },
  purple: {
    icon: 'bg-emerald-50/80 text-emerald-700',
    border: 'border-emerald-100',
    accent: 'text-emerald-700',
  },
} as const

export interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  description?: string
  trend?: { value: number; label: string }
  color: keyof typeof accentStyles
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color,
}: StatCardProps) {
  const styles = accentStyles[color]

  return (
    <article
      className={cn(
        'rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
        styles.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
          </p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {trend && (
            <p className={cn('text-xs font-medium', styles.accent)}>
              {trend.value > 0 ? '+' : ''}
              {trend.value} {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            styles.icon
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </article>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-8 w-16 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="h-12 w-12 rounded-2xl bg-muted" />
      </div>
    </div>
  )
}
