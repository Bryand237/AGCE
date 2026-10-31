'use client'

import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  classeBoutonDangerPlein,
  classeBoutonPrimaire,
  classeBoutonSecondaire,
} from '@/lib/ui-classes'
import { BoiteDialogue, type TonDialogue } from './boite-dialogue'

export type OptionsConfirmation = {
  /** Une question : « Supprimer cette absence ? » */
  titre: string
  /** Les conséquences, en clair : ce qui sera perdu ou changé, et si c'est irréversible. */
  description?: ReactNode
  /** Le verbe de l'action, pas « Oui » ni « OK » : « Supprimer l'absence ». */
  libelleConfirmer: string
  /** Texte du bouton pendant l'action (défaut : le libellé suivi de « … »). */
  libelleEnCours?: string
  libelleAnnuler?: string
  /**
   * `danger` : détruit des données. `avertissement` : ne se défait pas (signature, validation).
   * `neutre` : se corrige ensuite. Les deux premiers sont annoncés comme une alerte, focalisent
   * « Annuler » et ne se ferment pas au clic sur le fond.
   */
  ton?: TonDialogue
  icone?: LucideIcon
  /** Corps additionnel (liste…). */
  contenu?: ReactNode
  /**
   * Récapitulatif de ce qui va être enregistré, calculé à l'ouverture à partir de la saisie du
   * formulaire (ex. la date de retour, le numéro de décision) : l'utilisateur relit ce qu'il a
   * tapé avant de s'engager. Ne jamais y mettre un mot de passe.
   */
  recapitulatif?: (donnees: FormData) => ReactNode
  /** L'état « en cours » du formulaire (le 3ᵉ élément de useActionState / useActionConservee). */
  enCours: boolean
  /**
   * Gestionnaire d'envoi du formulaire (celui que renvoie `useActionConservee`), appelé quand
   * l'envoi est confirmé. Inutile avec `<form action={...}>`, que React traite tout seul.
   */
  surEnvoi?: (evenement: FormEvent<HTMLFormElement>) => void
  /**
   * Demande-t-on confirmation pour cet envoi-ci ? Par défaut toujours. Permet de n'interrompre
   * que certains envois (ex. seulement quand le formulaire annonce un risque).
   */
  demander?: (formulaire: HTMLFormElement) => boolean
}

/**
 * Demande confirmation avant l'envoi d'un formulaire, dans une fenêtre de l'application.
 * Remplace `confirm()` : le formulaire, son action serveur et son état d'attente restent ceux
 * qu'il avait, seule la question change de forme.
 *
 *   const confirmation = useConfirmation({
 *     titre: 'Supprimer cette absence ?',
 *     description: 'Cette action est irréversible.',
 *     libelleConfirmer: "Supprimer l'absence",
 *     ton: 'danger',
 *     enCours: isPending,
 *   })
 *   ...
 *   <>
 *     <form action={formAction} onSubmit={confirmation.surEnvoi}> … </form>
 *     {confirmation.dialogue}
 *   </>
 *
 * Déroulement : le premier envoi (bouton ou touche Entrée, une fois la validation HTML passée)
 * est suspendu et ouvre la fenêtre ; « Confirmer » renvoie le formulaire avec le MÊME bouton, donc
 * avec son `name`/`value` éventuel ; la fenêtre reste ouverte, boutons figés, pendant l'action et
 * se ferme à la fin. Si l'action réussit en redirigeant, la page change ; si elle échoue, le
 * formulaire reste affiché avec son message d'erreur, à côté du bouton.
 */
export function useConfirmation(options: OptionsConfirmation) {
  const { surEnvoi: envoyer, demander, recapitulatif, ...affichage } = options
  const { enCours } = affichage
  const [ouvert, setOuvert] = useState(false)
  const [actionVue, setActionVue] = useState(false)
  const [resume, setResume] = useState<ReactNode>(null)
  const confirmee = useRef(false)
  // Garde contre le double clic : deux clics dans le même instant arrivent avant que React n'ait
  // affiché l'état « en cours », que `enCours` seul ne verrait donc pas.
  const envoiLance = useRef(false)
  const formulaire = useRef<HTMLFormElement | null>(null)
  const declencheur = useRef<HTMLElement | null>(null)

  // Ferme la fenêtre quand l'action se termine (réussie sans changer de page, ou en erreur).
  // « Ajuster l'état pendant le rendu » plutôt qu'un effet : pas de rendu intermédiaire fenêtre
  // ouverte alors que l'action est finie.
  if (enCours && !actionVue) setActionVue(true)
  if (!enCours && actionVue) {
    setActionVue(false)
    setOuvert(false)
  }

  function surEnvoi(evenement: FormEvent<HTMLFormElement>) {
    if (confirmee.current || (demander && !demander(evenement.currentTarget))) {
      confirmee.current = false
      envoyer?.(evenement)
      return
    }
    // Envoi suspendu : React voit l'envoi annulé et ne lance pas l'action.
    evenement.preventDefault()
    formulaire.current = evenement.currentTarget
    envoiLance.current = false
    const envoyeur = (evenement.nativeEvent as SubmitEvent).submitter
    declencheur.current = envoyeur
    if (recapitulatif) setResume(recapitulatif(new FormData(evenement.currentTarget, envoyeur)))
    setOuvert(true)
  }

  function confirmer() {
    const cible = formulaire.current
    if (enCours || envoiLance.current || !cible) return
    envoiLance.current = true
    confirmee.current = true
    const bouton = declencheur.current
    if (bouton && (bouton as HTMLButtonElement).form === cible) {
      cible.requestSubmit(bouton)
    } else {
      cible.requestSubmit()
    }
    // L'envoi est synchrone : si l'indicateur est encore levé, il n'a pas eu lieu (validation
    // refusée) — on le baisse pour qu'il ne serve pas à contourner la question la fois suivante.
    if (confirmee.current) {
      confirmee.current = false
      envoiLance.current = false
      setOuvert(false)
    }
  }

  function annuler() {
    if (enCours) return
    setOuvert(false)
  }

  const dialogue = (
    <BoiteConfirmation
      ouvert={ouvert}
      onConfirmer={confirmer}
      onAnnuler={annuler}
      {...affichage}
      contenu={
        resume || affichage.contenu ? (
          <div className="space-y-3">
            {resume}
            {affichage.contenu}
          </div>
        ) : undefined
      }
    />
  )

  return { surEnvoi, dialogue, ouvert }
}

/** La fenêtre de confirmation seule, pour les cas où l'on pilote soi-même `ouvert`. */
export function BoiteConfirmation({
  ouvert,
  onConfirmer,
  onAnnuler,
  titre,
  description,
  libelleConfirmer,
  libelleEnCours,
  libelleAnnuler = 'Annuler',
  ton = 'neutre',
  icone,
  contenu,
  enCours,
}: Pick<
  OptionsConfirmation,
  | 'titre'
  | 'description'
  | 'libelleConfirmer'
  | 'libelleEnCours'
  | 'libelleAnnuler'
  | 'ton'
  | 'icone'
  | 'contenu'
  | 'enCours'
> & {
  ouvert: boolean
  onConfirmer: () => void
  onAnnuler: () => void
}) {
  const danger = ton === 'danger'
  // Question grave : « Annuler » reçoit le focus, Entrée n'engage rien par réflexe.
  const grave = ton !== 'neutre'
  const largeurBouton = 'w-full sm:w-auto'
  return (
    <BoiteDialogue
      ouvert={ouvert}
      onFermer={onAnnuler}
      fermable={!enCours}
      titre={titre}
      description={description}
      ton={ton}
      icone={icone}
      actions={
        <>
          <button
            type="button"
            onClick={onAnnuler}
            disabled={enCours}
            data-focus-initial={grave ? '' : undefined}
            className={cn(classeBoutonSecondaire, largeurBouton)}
          >
            {libelleAnnuler}
          </button>
          {/* aria-disabled plutôt que disabled : le bouton garde le focus pendant l'attente. */}
          <button
            type="button"
            onClick={onConfirmer}
            aria-disabled={enCours}
            data-focus-initial={grave ? undefined : ''}
            className={cn(
              danger ? classeBoutonDangerPlein : classeBoutonPrimaire,
              largeurBouton,
              'aria-disabled:pointer-events-none aria-disabled:opacity-50'
            )}
          >
            {enCours ? (libelleEnCours ?? `${libelleConfirmer}…`) : libelleConfirmer}
          </button>
        </>
      }
    >
      {contenu}
    </BoiteDialogue>
  )
}
