import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export type Tonalite = 'neutre' | 'danger'

export function EtatPage({
  icon: Icon,
  titre,
  message,
  lienRetour = '/dashboard',
  labelRetour = 'Retour au tableau de bord',
  tonalite = 'neutre',
}: {
  icon: LucideIcon
  titre: string
  message: string
  lienRetour?: string
  labelRetour?: string
  tonalite?: Tonalite
}) {
  const circleClasses =
    tonalite === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-6 px-4 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${circleClasses}`}
        >
          <Icon className="h-8 w-8" />
        </div>

        <h1 className="text-foreground text-xl font-bold">{titre}</h1>

        <p className="text-muted-foreground mx-auto max-w-xl text-sm">{message}</p>

        <Link
          href={lienRetour}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-lg px-4 py-2 text-sm font-medium"
        >
          {labelRetour}
        </Link>
      </div>
    </div>
  )
}

export default EtatPage
