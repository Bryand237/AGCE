'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { lireMessage, PARAMETRE_MESSAGE } from '@/lib/messages-flash'
import type { TonMessage } from '@/lib/messages-flash'
import { STYLES_ALERTE } from './alerte'

export type Notification = {
  ton: TonMessage
  message: string
  /** Reste affiché jusqu'à la fermeture. Par défaut : seuls succès et infos disparaissent seuls. */
  persistante?: boolean
}

type NotificationAffichee = Notification & { id: number }

/** Durée d'affichage d'un message qui disparaît seul, et nombre maximal à l'écran. */
const DUREE_MS = 6000
const MAXIMUM = 3

const BORD_GAUCHE: Record<TonMessage, string> = {
  succes: 'border-l-success',
  info: 'border-l-primary',
  avertissement: 'border-l-amber-500',
  erreur: 'border-l-destructive',
}

let dernierId = 0

const Contexte = createContext<((notification: Notification) => void) | null>(null)

/**
 * Affiche les notifications (« toasts ») de toute l'application, en bas à droite : un coup d'œil,
 * sans interrompre le travail. À monter une fois, dans la mise en page du tableau de bord.
 *
 * - Un message identique déjà à l'écran n'est pas ajouté une seconde fois.
 * - Trois messages au plus ; le plus ancien cède la place.
 * - Succès et infos disparaissent seuls (6 s, interrompu tant que la souris ou le focus est
 *   dessus) ; avertissements et erreurs restent jusqu'à la fermeture.
 * - Annoncés aux lecteurs d'écran (`aria-live`).
 */
export function FournisseurNotifications({ children }: { children: ReactNode }) {
  const [liste, setListe] = useState<NotificationAffichee[]>([])

  const notifier = useCallback((notification: Notification) => {
    const id = ++dernierId
    setListe((courante) => {
      const dejaLa = courante.some(
        (n) => n.ton === notification.ton && n.message === notification.message
      )
      return dejaLa ? courante : [...courante, { ...notification, id }].slice(-MAXIMUM)
    })
  }, [])

  const fermer = useCallback((id: number) => {
    setListe((courante) => courante.filter((n) => n.id !== id))
  }, [])

  return (
    <Contexte.Provider value={notifier}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
      >
        {liste.map((notification) => (
          <Toast key={notification.id} notification={notification} fermer={fermer} />
        ))}
      </div>
    </Contexte.Provider>
  )
}

function Toast({
  notification,
  fermer,
}: {
  notification: NotificationAffichee
  /** Stable d'un rendu à l'autre : l'arrivée d'un autre message ne relance pas le minuteur. */
  fermer: (id: number) => void
}) {
  const { id, ton, message } = notification
  const [enPause, setEnPause] = useState(false)
  const persistante = notification.persistante ?? (ton === 'erreur' || ton === 'avertissement')
  const { Icone, pastille } = STYLES_ALERTE[ton]

  useEffect(() => {
    if (persistante || enPause) return
    const minuteur = setTimeout(() => fermer(id), DUREE_MS)
    return () => clearTimeout(minuteur)
  }, [persistante, enPause, fermer, id])

  return (
    <div
      // Une erreur est annoncée tout de suite ; le reste via la zone `aria-live` polie.
      role={ton === 'erreur' ? 'alert' : undefined}
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      onFocus={() => setEnPause(true)}
      onBlur={() => setEnPause(false)}
      className={cn(
        'border-border bg-card text-card-foreground pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-l-4 p-4 text-sm shadow-lg sm:w-96',
        'animate-apparition motion-reduce:animate-none',
        BORD_GAUCHE[ton]
      )}
    >
      <Icone aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', pastille)} />
      <p className="text-foreground min-w-0 flex-1 leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={() => fermer(id)}
        aria-label="Fermer la notification"
        className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 shrink-0 rounded-lg p-1"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Pour déclencher une notification depuis un composant : `notifier({ ton: 'succes', message })`. */
export function useNotifier() {
  const notifier = useContext(Contexte)
  if (!notifier) {
    throw new Error('useNotifier doit être utilisé dans <FournisseurNotifications>.')
  }
  return notifier
}

/**
 * Enveloppe une action serveur de formulaire : quand elle répond `{ succes: true, message }`, le
 * message est affiché en notification. La notification part à l'arrivée de la réponse, que le
 * formulaire soit toujours à l'écran ou non : celui d'un transfert disparaît dès que le statut
 * change, et un message écrit dans le formulaire serait perdu.
 *
 *   useActionState(useReussiteNotifiee(marquerTransfere.bind(null, id)), etatInitial)
 *
 * Les actions qui terminent par `redirect()` n'ont pas de réponse à envoyer : elles passent par
 * `avecMessage()` (voir lib/messages-flash.ts).
 */
export function useReussiteNotifiee<Etat extends { message?: string; succes?: boolean }>(
  action: (etat: Etat, donnees: FormData) => Promise<Etat> | Etat
) {
  const notifier = useNotifier()
  return async (etat: Etat, donnees: FormData): Promise<Etat> => {
    const suivant = await action(etat, donnees)
    if (suivant.succes && suivant.message) notifier({ ton: 'succes', message: suivant.message })
    return suivant
  }
}

/**
 * Lit le paramètre `?msg=` de l'adresse (voir lib/messages-flash.ts), affiche le message
 * correspondant puis retire le paramètre : un rechargement de la page ne le rejoue pas.
 * À monter une fois, sous <FournisseurNotifications>, dans une frontière <Suspense>.
 */
export function NotificateurUrl() {
  const parametres = useSearchParams()
  const notifier = useNotifier()
  const code = parametres.get(PARAMETRE_MESSAGE)

  useEffect(() => {
    if (!code) return
    const message = lireMessage(code)
    if (message) notifier(message)

    const adresse = new URL(window.location.href)
    adresse.searchParams.delete(PARAMETRE_MESSAGE)
    window.history.replaceState(null, '', `${adresse.pathname}${adresse.search}${adresse.hash}`)
  }, [code, notifier])

  return null
}
