'use client'

import { useActionState } from 'react'
import { genererDecision, validerDecision, type EtatFormulaire } from '../../actions'
import { classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

export function BlocDecision({
  id,
  avancementId,
  statutDecision,
  numeroDecision,
}: {
  id: string
  avancementId: string
  statutDecision: string | null
  numeroDecision: string | null
}) {
  const [, formActionGenerer] = useActionState(
    genererDecision.bind(null, avancementId),
    etatInitial
  )
  const [state, formActionValider, isPending] = useActionState(
    validerDecision.bind(null, avancementId),
    etatInitial
  )

  if (!statutDecision) {
    return (
      <form action={formActionGenerer}>
        <button type="submit" className={classeBoutonPrimaire}>
          Générer le brouillon de décision
        </button>
      </form>
    )
  }
  if (statutDecision === 'EN_ATTENTE') {
    return (
      <div className="flex flex-col gap-4">
        <a
          href={`/avancements/${id}/${avancementId}/decision`}
          download
          className="text-sm font-medium text-primary hover:underline"
        >
          Télécharger le brouillon
        </a>
        <form action={formActionValider} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Numéro de décision
            <input name="numeroDecision" required placeholder="0000123" className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Date de validation
            <input type="date" name="dateValidation" required className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Auteur de la validation
            <input name="auteurValidation" required className={classeChamp} />
          </label>
          {state.message && <p className="text-destructive text-sm">{state.message}</p>}
          <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
            {isPending ? 'Enregistrement...' : 'Marquer signée'}
          </button>
        </form>
      </div>
    )
  }
  return (
    <a
      href={`/avancements/${id}/${avancementId}/decision`}
      download
      className="text-sm font-medium text-primary hover:underline"
    >
      Télécharger la décision n°{numeroDecision}
    </a>
  )
}
