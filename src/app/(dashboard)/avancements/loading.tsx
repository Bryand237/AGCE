import { StatCardSkeleton } from '@/components/dashboard/stat-card'
import { ChartCardSkeleton, Skeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function LoadingAvancements() {
  return (
    <div className="space-y-8">
      <div className="border-primary/20 from-primary/10 via-card to-card space-y-3 rounded-2xl border bg-gradient-to-br p-6 shadow-sm lg:p-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-80" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <ChartCardSkeleton />

      <form className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-24" />
      </form>

      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <TableSkeleton lignes={6} colonnes={4} />
      </div>
    </div>
  )
}
