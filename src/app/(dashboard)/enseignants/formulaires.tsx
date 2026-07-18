'use client'

import { useActionState } from 'react'
import {
  marquerTransfere,
  marquerRetraite,
  reactiverEnseignant,
  type EtatFormulaire,
} from './actions'

const etatInitial: EtatFormulaire = {}
const classeChamp =
  'rounded-xl border border-border bg-background px-3 py-2 text-sm'

export function FormulaireTransfert({ enseignantId }: { enseignantId: string }) {
  const [state, formAction, isPending] = useActionState(
    marquerTransfere.bind(null, enseignantId),
    etatInitial
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm('Confirmer le transfert de cet enseignant hors de l\'UN ?')) {
      e.preventDefault()
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm"
    >
      <p className="text-sm font-semibold text-foreground">Marquer comme transféré</p>
      <p className="text-xs text-muted-foreground">
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
        Observations
        <textarea name="observations" rows={2} className={classeChamp} />
      </label>
      {state.message && (
        <p
          className={`text-sm ${state.message.includes('transféré') ? 'text-primary' : 'text-destructive'}`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
      >
        {isPending ? 'Enregistrement...' : 'Confirmer le transfert'}
      </button>
    </form>
  )
}

export function FormulaireRetraite({
  enseignantId,
  dateRetraitePrevue,
}: {
  enseignantId: string
  dateRetraitePrevue?: string
}) {
  const [state, formAction, isPending] = useActionState(
    marquerRetraite.bind(null, enseignantId),
    etatInitial
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm('Confirmer la mise à la retraite de cet enseignant ?')) {
      e.preventDefault()
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-5 shadow-sm"
    >
      <p className="text-sm font-semibold text-foreground">Marquer comme retraité</p>
      {dateRetraitePrevue && (
        <p className="text-xs text-muted-foreground">
          Retraite prévue le{' '}
          {new Date(dateRetraitePrevue).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
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
      <label className="flex flex-col gap-1 text-sm">
        Observations
        <textarea name="observations" rows={2} className={classeChamp} />
      </label>
      {state.message && (
        <p
          className={`text-sm ${state.message.includes('retraité') ? 'text-primary' : 'text-destructive'}`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted"
      >
        {isPending ? 'Enregistrement...' : 'Confirmer la retraite'}
      </button>
    </form>
  )
}

export function BoutonReactiver({ enseignantId }: { enseignantId: string }) {
  const [state, formAction, isPending] = useActionState(
    reactiverEnseignant.bind(null, enseignantId),
    etatInitial
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm('Réactiver cet enseignant et remettre son statut à ACTIF ?')) {
      e.preventDefault()
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      {state.message && <p className="text-primary mb-2 text-sm">{state.message}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
      >
        {isPending ? 'Réactivation...' : 'Réactiver l&apos;enseignant'}
      </button>
    </form>
  )
}
