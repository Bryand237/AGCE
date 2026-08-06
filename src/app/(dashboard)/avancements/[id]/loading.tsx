import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function LoadingAvancementDetail() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <TableSkeleton lignes={4} colonnes={3} />
      </div>
    </div>
  )
}
