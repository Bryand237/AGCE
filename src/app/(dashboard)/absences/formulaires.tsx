'use client'

import { useActionState } from 'react'
import {
  validerAbsence,
  terminerAbsence,
  genererAttestation,
  validerAttestation,
  type EtatFormulaire,
} from './actions'
import { classeBoutonPrimaire, classeChamp, classeFormulaire } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

export function FormulaireValidationAbsence({
  absenceId,
  estCongeMaternite,
}: {
  absenceId: string
  estCongeMaternite: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    validerAbsence.bind(null, absenceId),
    etatInitial
  )
  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-sm font-semibold text-foreground">Valider la demande</p>
      <label className="flex flex-col gap-1 text-sm">
        Date de validation
        <input type="date" name="dateValidation" required className={classeChamp} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Auteur de la validation
        <input name="auteurValidation" required placeholder="Le Recteur" className={classeChamp} />
      </label>
      {estCongeMaternite && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Référence de la correspondance
            <input name="referenceCorrespondance" className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Date de la correspondance
            <input type="date" name="dateCorrespondance" className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Date de la demande de l&apos;intéressée
            <input type="date" name="dateDemandeInteressee" className={classeChamp} />
          </label>
        </>
      )}
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Validation...' : 'Valider'}
      </button>
    </form>
  )
}

export function FormulaireTerminerAbsence({
  absenceId,
  estDepasse,
}: {
  absenceId: string
  estDepasse: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    terminerAbsence.bind(null, absenceId),
    etatInitial
  )
  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-sm font-semibold text-foreground">
        {estDepasse ? 'Enseignant de retour (durée dépassée)' : "Marquer l'enseignant de retour"}
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Date de retour
        <input type="date" name="dateRetour" required className={classeChamp} />
      </label>
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Enregistrement...' : 'Marquer terminé'}
      </button>
    </form>
  )
}

export function BlocAttestationAbsence({
  absenceId,
  statutAttestation,
  numeroDecision,
}: {
  absenceId: string
  statutAttestation: string | null
  numeroDecision: string | null
}) {
  const [, formActionGenerer] = useActionState(
    genererAttestation.bind(null, absenceId),
    etatInitial
  )
  const [state, formActionValider, isPending] = useActionState(
    validerAttestation.bind(null, absenceId),
    etatInitial
  )

  if (!statutAttestation) {
    return (
      <form action={formActionGenerer}>
        <button type="submit" className={classeBoutonPrimaire}>
          Générer le brouillon d&apos;attestation
        </button>
      </form>
    )
  }
  if (statutAttestation === 'EN_ATTENTE') {
    return (
      <div className="flex flex-col gap-4">
        <a
          href={`/absences/${absenceId}/attestation`}
          download
          className="text-sm font-medium text-primary hover:underline"
        >
          Télécharger le brouillon
        </a>
        <form action={formActionValider} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Numéro de décision
            <input name="numeroDecision" required className={classeChamp} />
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
      href={`/absences/${absenceId}/attestation`}
      download
      className="text-sm font-medium text-primary hover:underline"
    >
      Télécharger l&apos;attestation n°{numeroDecision}
    </a>
  )
}
