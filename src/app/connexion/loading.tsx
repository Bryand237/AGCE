import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingConnexion() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 space-y-4">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  )
}
