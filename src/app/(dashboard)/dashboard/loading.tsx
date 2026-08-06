import { StatCardSkeleton } from '@/components/dashboard/stat-card'
import { ChartCardSkeleton, Skeleton } from '@/components/ui/skeleton'

export default function LoadingDashboard() {
  return (
    <div className="space-y-8">
      <section className="border-primary/20 from-primary/10 via-card to-card relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-sm lg:p-8">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-3 w-96" />
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="border-border bg-card/80 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-6 w-20" />
            </div>
            <div className="border-border bg-card/80 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-6 w-20" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[55%_45%]">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      <ChartCardSkeleton />
    </div>
  )
}
