import { cn } from '@/lib/utils'

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
