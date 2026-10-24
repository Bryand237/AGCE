import type { LucideIcon } from 'lucide-react'

/**
 * Cadre d'une liste officielle sur la page « Éditions » : son titre, ce qu'elle contient, puis
 * son formulaire (paramètres et boutons de téléchargement). Chaque nouvelle liste n'est qu'une
 * carte de plus.
 */
export function CarteEdition({
  icone: Icone,
  titre,
  description,
  children,
}: {
  icone: LucideIcon
  titre: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="border-border bg-card rounded-2xl border p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <Icone size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-foreground text-base font-semibold">{titre}</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
