import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function LoadingAbsenceDetail() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <TableSkeleton lignes={4} colonnes={3} />
      </div>
    </div>
  )
}
