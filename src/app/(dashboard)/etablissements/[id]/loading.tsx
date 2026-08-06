import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function LoadingEtablissementDetail() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <TableSkeleton lignes={3} colonnes={2} />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <TableSkeleton lignes={3} colonnes={2} />
        </div>
      </div>
    </div>
  )
}
