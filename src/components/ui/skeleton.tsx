import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-muted animate-pulse rounded-lg', className)} />
}

export function ChartCardSkeleton() {
  return (
    <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      <div>
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    </div>
  )
}

export function TableSkeleton({
  lignes = 6,
  colonnes = 5,
}: {
  lignes?: number
  colonnes?: number
}) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="space-y-3 p-4">
        {Array.from({ length: lignes }).map((_, i) => (
          <div key={i} className="flex gap-3">
            {Array.from({ length: colonnes }).map((__, j) => (
              <Skeleton key={j} className="h-10 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Skeleton
