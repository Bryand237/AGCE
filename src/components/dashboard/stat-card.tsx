import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const accentStyles = {
  blue: { icon: 'bg-primary/10 text-primary', border: 'border-primary/15', accent: 'text-primary' },
  green: {
    icon: 'bg-success/10 text-success',
    border: 'border-success/15',
    accent: 'text-success',
  },
  amber: {
    icon: 'bg-secondary/20 text-primary',
    border: 'border-secondary/25',
    accent: 'text-primary',
  },
  rose: {
    icon: 'bg-destructive/10 text-destructive',
    border: 'border-destructive/15',
    accent: 'text-destructive',
  },
  purple: {
    icon: 'bg-grade-mc/10 text-grade-mc',
    border: 'border-grade-mc/15',
    accent: 'text-grade-mc',
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

export function StatCard({ title, value, icon: Icon, description, trend, color }: StatCardProps) {
  const styles = accentStyles[color]

  return (
    <article
      className={cn(
        'bg-card rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md',
        styles.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-foreground text-3xl font-bold tracking-tight">
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
          </p>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
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
    <div className="border-border bg-card animate-pulse rounded-2xl border p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="bg-muted h-4 w-24 rounded" />
          <div className="bg-muted h-8 w-16 rounded" />
          <div className="bg-muted h-3 w-32 rounded" />
        </div>
        <div className="bg-muted h-12 w-12 rounded-2xl" />
      </div>
    </div>
  )
}
