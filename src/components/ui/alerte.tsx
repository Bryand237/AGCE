import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CircleX, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TonAlerte = 'info' | 'succes' | 'avertissement' | 'erreur'

/**
 * Teintes : fond léger + bordure + pastille d'icône colorée, texte toujours en couleur de texte
 * normale. La palette institutionnelle est très sombre : un texte coloré sur fond teinté serait
 * lourd à lire, et la couleur seule ne doit jamais porter le sens (d'où l'icône).
 */
export const STYLES_ALERTE = {
  info: { Icone: Info, cadre: 'border-primary/20 bg-primary/5', pastille: 'text-primary' },
  succes: {
    Icone: CheckCircle2,
    cadre: 'border-success/25 bg-success/5',
    pastille: 'text-success',
  },
  avertissement: {
    Icone: AlertTriangle,
    cadre: 'border-amber-200 bg-amber-50',
    pastille: 'text-amber-600',
  },
  erreur: {
    Icone: CircleX,
    cadre: 'border-destructive/25 bg-destructive/5',
    pastille: 'text-destructive',
  },
} as const

/**
 * Message affiché dans la page (et non dans une fenêtre) : erreur d'une action, avertissement,
 * information durable.
 *
 * Le rôle ARIA suit la gravité : une erreur est annoncée tout de suite (`alert`), le reste sans
 * interrompre (`status`). `role` permet d'en choisir un autre quand la page l'exige.
 */
export function Alerte({
  ton = 'info',
  titre,
  children,
  onFermer,
  role,
  className,
}: {
  ton?: TonAlerte
  titre?: string
  children?: ReactNode
  /** Affiche une croix de fermeture quand il est fourni. */
  onFermer?: () => void
  role?: 'alert' | 'status' | 'none'
  className?: string
}) {
  const { Icone, cadre, pastille } = STYLES_ALERTE[ton]
  return (
    <div
      role={role ?? (ton === 'erreur' ? 'alert' : 'status')}
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm',
        cadre,
        className
      )}
    >
      <Icone aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', pastille)} />
      <div className="text-foreground min-w-0 flex-1 space-y-1 leading-relaxed">
        {titre && <p className="font-semibold">{titre}</p>}
        {children && <div>{children}</div>}
      </div>
      {onFermer && (
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer ce message"
          className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 shrink-0 rounded-lg p-1"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
