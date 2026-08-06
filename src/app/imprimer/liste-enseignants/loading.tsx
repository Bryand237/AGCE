import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingImprimerListe() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-56" />
      <div className="mt-4 grid gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
