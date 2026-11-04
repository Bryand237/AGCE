'use client'

import { useActionState } from 'react'
import { Alerte } from '@/components/ui/alerte'
import { useReussiteNotifiee } from '@/components/ui/notifications'
import { useConfirmation } from '@/components/ui/confirmation'
import { Recapitulatif, dateEnClair, texteEnClair } from '@/components/ui/recapitulatif'
import { formaterDateMoisEnLettres } from '@/domain/dates/formaterDateMoisEnLettres'
import { marquerTransfere, marquerRetraite, reactiverEnseignant } from './actions'
import type { EtatFormulaire } from '@/lib/formulaires'

const etatInitial: EtatFormulaire = {}
const classeChamp = 'rounded-xl border border-border bg-background px-3 py-2 text-sm'

export function FormulaireTransfert({
  enseignantId,
  nomComplet = 'cet enseignant',
}: {
  enseignantId: string
  /** « Prénom NOM » : rend la question de confirmation précise. */
  nomComplet?: string
}) {
  const [state, formAction, isPending] = useActionState(
    useReussiteNotifiee(marquerTransfere.bind(null, enseignantId)),
    etatInitial
  )
  const confirmation = useConfirmation({
    titre: `Transférer ${nomComplet} hors de l'UN ?`,
    description:
      "Il quittera l'effectif actif de l'Université. Vous pourrez le réactiver ensuite depuis sa fiche.",
    libelleConfirmer: 'Confirmer le transfert',
    libelleEnCours: 'Transfert…',
    enCours: isPending,
    recapitulatif: (donnees) => (
      <Recapitulatif
        lignes={[
          { libelle: 'Date effective', valeur: dateEnClair(donnees.get('dateFinService')) },
          { libelle: 'Destination', valeur: texteEnClair(donnees.get('lieuTransfert')) },
        ]}
      />
    ),
  })

  return (
    <>
      <form
        action={formAction}
        onSubmit={confirmation.surEnvoi}
        className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm"
      >
        <p className="text-foreground text-sm font-semibold">Marquer comme transféré</p>
        <p className="text-muted-foreground text-xs">
          L&apos;enseignant quittera l&apos;effectif actif de l&apos;UN.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Date effective du transfert
          <input type="date" name="dateFinService" required className={classeChamp} />
          {state.errors?.dateFinService && (
            <p className="text-destructive text-sm">{state.errors.dateFinService[0]}</p>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Lieu de destination
          <input
            name="lieuTransfert"
            required
            placeholder="Ex: Université de Douala"
            className={classeChamp}
          />
          {state.errors?.lieuTransfert && (
            <p className="text-destructive text-sm">{state.errors.lieuTransfert[0]}</p>
          )}
        </label>
        {state.message && !state.succes && <Alerte ton="erreur">{state.message}</Alerte>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          {isPending ? 'Enregistrement...' : 'Confirmer le transfert'}
        </button>
      </form>
      {confirmation.dialogue}
    </>
  )
}

export function FormulaireRetraite({
  enseignantId,
  dateRetraitePrevue,
  nomComplet = 'cet enseignant',
}: {
  enseignantId: string
  dateRetraitePrevue?: string
  /** « Prénom NOM » : rend la question de confirmation précise. */
  nomComplet?: string
}) {
  const [state, formAction, isPending] = useActionState(
    useReussiteNotifiee(marquerRetraite.bind(null, enseignantId)),
    etatInitial
  )
  const confirmation = useConfirmation({
    titre: `Mettre ${nomComplet} à la retraite ?`,
    description:
      "Il quittera l'effectif actif à la date indiquée. Vous pourrez le réactiver ensuite depuis sa fiche.",
    libelleConfirmer: 'Confirmer la retraite',
    libelleEnCours: 'Enregistrement…',
    enCours: isPending,
    recapitulatif: (donnees) => (
      <Recapitulatif
        lignes={[{ libelle: 'Date de départ', valeur: dateEnClair(donnees.get('dateFinService')) }]}
      />
    ),
  })

  return (
    <>
      <form
        action={formAction}
        onSubmit={confirmation.surEnvoi}
        className="border-border bg-muted/30 flex flex-col gap-3 rounded-2xl border p-5 shadow-sm"
      >
        <p className="text-foreground text-sm font-semibold">Marquer comme retraité</p>
        {dateRetraitePrevue && (
          <p className="text-muted-foreground text-xs">
            Retraite prévue le {formaterDateMoisEnLettres(new Date(dateRetraitePrevue))}
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Date effective de départ
          <input
            type="date"
            name="dateFinService"
            required
            defaultValue={dateRetraitePrevue}
            className={classeChamp}
          />
          {state.errors?.dateFinService && (
            <p className="text-destructive text-sm">{state.errors.dateFinService[0]}</p>
          )}
        </label>
        {state.message && !state.succes && <Alerte ton="erreur">{state.message}</Alerte>}
        <button
          type="submit"
          disabled={isPending}
          className="border-border bg-card hover:bg-muted rounded-xl border px-4 py-2.5 text-sm font-medium"
        >
          {isPending ? 'Enregistrement...' : 'Confirmer la retraite'}
        </button>
      </form>
      {confirmation.dialogue}
    </>
  )
}

export function BoutonReactiver({
  enseignantId,
  nomComplet = 'cet enseignant',
}: {
  enseignantId: string
  /** « Prénom NOM » : rend la question de confirmation précise. */
  nomComplet?: string
}) {
  const [state, formAction, isPending] = useActionState(
    useReussiteNotifiee(reactiverEnseignant.bind(null, enseignantId)),
    etatInitial
  )
  const confirmation = useConfirmation({
    titre: `Réactiver ${nomComplet} ?`,
    description:
      'Son statut redeviendra « Actif ». La date de fin de service et la destination du transfert seront effacées de sa fiche.',
    libelleConfirmer: 'Réactiver',
    libelleEnCours: 'Réactivation…',
    enCours: isPending,
  })

  return (
    <>
      <form action={formAction} onSubmit={confirmation.surEnvoi}>
        {state.message && !state.succes && (
          <Alerte ton="erreur" className="mb-3">
            {state.message}
          </Alerte>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm hover:opacity-90"
        >
          {isPending ? 'Réactivation...' : "Réactiver l'enseignant"}
        </button>
      </form>
      {confirmation.dialogue}
    </>
  )
}
