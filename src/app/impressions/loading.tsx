import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingImpressions() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 space-y-4">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-6 w-64" />
      </div>
    </div>
  )
}
