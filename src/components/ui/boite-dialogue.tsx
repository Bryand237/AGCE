'use client'

import { useEffect, useId, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TonDialogue = 'neutre' | 'danger' | 'avertissement'

const TONS: Record<TonDialogue, { Icone: LucideIcon; pastille: string }> = {
  neutre: { Icone: Info, pastille: 'bg-primary/10 text-primary' },
  danger: { Icone: AlertTriangle, pastille: 'bg-destructive/10 text-destructive' },
  avertissement: { Icone: AlertTriangle, pastille: 'bg-amber-100 text-amber-700' },
}

const LARGEURS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const

/**
 * Fenêtre modale de l'application, bâtie sur l'élément natif <dialog> et `showModal()` : le
 * navigateur fournit lui-même ce qui est difficile à réussir à la main — le reste de la page est
 * inerte (ni clic, ni Tab, ni lecteur d'écran), Échap est géré, la fenêtre passe au-dessus de tout
 * (couche « top layer », pas de z-index) et le focus revient sur le bouton d'origine à la fermeture.
 *
 * L'état reste dans React (`ouvert`) : Échap et le clic sur le fond ne ferment jamais la fenêtre
 * directement, ils appellent `onFermer`, qui décide.
 *
 * - `ton="danger"` : rôle `alertdialog` (annoncé comme une alerte), clic sur le fond sans effet
 *   (un geste maladroit ne doit pas fermer une question grave sans que l'on s'en rende compte).
 * - `fermable={false}` : Échap et fond ignorés (action en cours : on ne referme pas la fenêtre
 *   sous les doigts de l'utilisateur).
 * - L'élément qui porte `data-focus-initial` reçoit le focus à l'ouverture. Pour une action
 *   destructrice, c'est « Annuler » : Entrée ne détruit rien par réflexe.
 *
 * Le contenu n'est monté que fenêtre ouverte : un formulaire ou un champ placé dans `children`
 * repart donc toujours d'un état vierge.
 */
export function BoiteDialogue({
  ouvert,
  onFermer,
  titre,
  description,
  ton = 'neutre',
  icone,
  largeur = 'md',
  fermable = true,
  fermerSurFond,
  children,
  actions,
}: {
  ouvert: boolean
  /** Demande de fermeture (Échap, clic sur le fond) : à l'appelant d'y répondre en mettant `ouvert` à faux. */
  onFermer: () => void
  titre: string
  description?: ReactNode
  ton?: TonDialogue
  /** Remplace l'icône du ton (ex. une corbeille pour une suppression). */
  icone?: LucideIcon
  largeur?: keyof typeof LARGEURS
  fermable?: boolean
  /** Défaut : la fenêtre se ferme au clic sur le fond, sauf en `danger`. */
  fermerSurFond?: boolean
  /** Corps additionnel sous la description (liste, récapitulatif…). */
  children?: ReactNode
  /** Pied de fenêtre : les boutons. */
  actions: ReactNode
}) {
  const dialogue = useRef<HTMLDialogElement>(null)
  const debutSurFond = useRef(false)
  const idTitre = useId()
  const idDescription = useId()
  const { Icone, pastille } = TONS[ton]
  const IconeAffichee = icone ?? Icone
  const fermerAuClicSurFond = fermerSurFond ?? ton !== 'danger'

  // Fait suivre l'état React au <dialog> natif.
  useEffect(() => {
    const element = dialogue.current
    if (!element) return
    if (ouvert && !element.open) {
      element.showModal()
      element.querySelector<HTMLElement>('[data-focus-initial]')?.focus()
    } else if (!ouvert && element.open) {
      element.close()
    }
  }, [ouvert])

  // Fenêtre démontée pendant qu'elle est ouverte (navigation) : on rend la page à l'utilisateur.
  useEffect(() => {
    const element = dialogue.current
    return () => {
      if (element?.open) element.close()
    }
  }, [])

  function memoriserDebutDeClic(evenement: MouseEvent<HTMLDialogElement>) {
    debutSurFond.current = evenement.target === evenement.currentTarget
  }

  // Un clic « sur le fond » est un clic dont le début ET la fin tombent sur le <dialog> lui-même
  // (le panneau le remplit entièrement) : sélectionner du texte et relâcher hors du panneau ne
  // doit pas fermer la fenêtre.
  function cliquer(evenement: MouseEvent<HTMLDialogElement>) {
    const surFond = evenement.target === evenement.currentTarget && debutSurFond.current
    debutSurFond.current = false
    if (surFond && fermerAuClicSurFond && fermable) onFermer()
  }

  return (
    <dialog
      ref={dialogue}
      role={ton === 'danger' ? 'alertdialog' : 'dialog'}
      aria-labelledby={idTitre}
      aria-describedby={description ? idDescription : undefined}
      onMouseDown={memoriserDebutDeClic}
      onClick={cliquer}
      onCancel={(evenement) => {
        // On garde la main : le navigateur ne ferme pas la fenêtre de lui-même.
        evenement.preventDefault()
        if (fermable) onFermer()
      }}
      onClose={() => {
        // Fermée par un autre moyen que `ouvert` (ex. seconde pression sur Échap, que certains
        // navigateurs imposent) : on resynchronise l'état.
        if (ouvert) onFermer()
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] overflow-visible bg-transparent p-0 text-left',
        'backdrop:bg-foreground/40 backdrop:backdrop-blur-[2px]',
        LARGEURS[largeur]
      )}
    >
      {ouvert && (
        <div className="border-border bg-card text-card-foreground animate-apparition flex max-h-[85vh] flex-col rounded-2xl border shadow-2xl motion-reduce:animate-none">
          <div className="flex gap-4 overflow-y-auto p-6">
            <span
              aria-hidden="true"
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                pastille
              )}
            >
              <IconeAffichee className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={idTitre} className="text-foreground text-base leading-6 font-semibold">
                {titre}
              </h2>
              {description && (
                <div
                  id={idDescription}
                  className="text-muted-foreground mt-1.5 space-y-2 text-sm leading-relaxed"
                >
                  {description}
                </div>
              )}
              {children && <div className="mt-4">{children}</div>}
            </div>
          </div>
          <div className="border-border bg-muted/40 flex flex-col-reverse gap-2 rounded-b-2xl border-t px-6 py-4 sm:flex-row sm:justify-end">
            {actions}
          </div>
        </div>
      )}
    </dialog>
  )
}
