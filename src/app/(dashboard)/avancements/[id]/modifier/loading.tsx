import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingAvancementModifier() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-56" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    </div>
  )
}
