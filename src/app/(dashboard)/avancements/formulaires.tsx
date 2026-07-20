'use client'

import { useActionState } from 'react'
import {
  ajouterSelection,
  validerRapport,
  rejeterRapport,
  mettreAJourMetadonneesSession,
  type EtatFormulaire,
} from './actions'
import { classeBoutonDanger, classeBoutonPrimaire, classeChamp, classeFormulaire } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

function formatDateInput(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : ''
}

type MetadonneesSession = {
  referenceLoiFinances: string | null
  referenceCirculaire: string | null
  dateSessionCU: Date | null
  dateSessionCA: Date | null
  dateSignatureDecisions: Date | null
}

export function FormulaireMetadonneesSession({
  rapportId,
  metadonnees,
  lectureSeule,
}: {
  rapportId: string
  metadonnees: MetadonneesSession
  lectureSeule?: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    mettreAJourMetadonneesSession.bind(null, rapportId),
    etatInitial
  )

  if (lectureSeule) {
    return (
      <div className={classeFormulaire}>
        <p className="text-sm font-semibold text-foreground">Métadonnées du conseil</p>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Loi de finances</dt>
            <dd>{metadonnees.referenceLoiFinances ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Circulaire MINFI</dt>
            <dd>{metadonnees.referenceCirculaire ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Session CU</dt>
            <dd>
              {metadonnees.dateSessionCU?.toLocaleDateString('fr-FR') ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Session CA</dt>
            <dd>
              {metadonnees.dateSessionCA?.toLocaleDateString('fr-FR') ?? '—'}
            </dd>
          </div>
        </dl>
      </div>
    )
  }

  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-sm font-semibold text-foreground">
        Métadonnées du conseil (pour les décisions individuelles)
      </p>
      <p className="text-xs text-muted-foreground">
        Ces champs alimentent les mentions « Vu la loi de finances », « Vu la circulaire » et
        les dates de session CU/CA dans chaque décision DOCX.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Loi de finances
        <input
          name="referenceLoiFinances"
          required
          defaultValue={metadonnees.referenceLoiFinances ?? ''}
          placeholder="Loi de Finances 2026"
          className={classeChamp}
        />
        {state.errors?.referenceLoiFinances && (
          <p className="text-destructive text-sm">{state.errors.referenceLoiFinances[0]}</p>
        )}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Circulaire MINFI
        <input
          name="referenceCirculaire"
          required
          defaultValue={metadonnees.referenceCirculaire ?? ''}
          className={classeChamp}
        />
        {state.errors?.referenceCirculaire && (
          <p className="text-destructive text-sm">{state.errors.referenceCirculaire[0]}</p>
        )}
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Date session CU
          <input
            type="date"
            name="dateSessionCU"
            required
            defaultValue={formatDateInput(metadonnees.dateSessionCU)}
            className={classeChamp}
          />
          {state.errors?.dateSessionCU && (
            <p className="text-destructive text-sm">{state.errors.dateSessionCU[0]}</p>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date session CA
          <input
            type="date"
            name="dateSessionCA"
            required
            defaultValue={formatDateInput(metadonnees.dateSessionCA)}
            className={classeChamp}
          />
          {state.errors?.dateSessionCA && (
            <p className="text-destructive text-sm">{state.errors.dateSessionCA[0]}</p>
          )}
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Date de signature des décisions (optionnelle)
        <input
          type="date"
          name="dateSignatureDecisions"
          defaultValue={formatDateInput(metadonnees.dateSignatureDecisions)}
          className={classeChamp}
        />
      </label>
      {state.message && (
        <p
          className={`text-sm ${state.message.includes('enregistr') ? 'text-primary' : 'text-destructive'}`}
        >
          {state.message}
        </p>
      )}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Enregistrement...' : 'Enregistrer les métadonnées'}
      </button>
    </form>
  )
}

export function FormulaireAjouterEnseignant({ rapportId }: { rapportId: string }) {
  const [state, formAction, isPending] = useActionState(
    ajouterSelection.bind(null, rapportId),
    etatInitial
  )
  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-sm font-semibold text-foreground">Ajouter un enseignant</p>
      <div className="flex gap-3">
        <input
          name="matricule"
          placeholder="Matricule de l'enseignant"
          className={`${classeChamp} flex-1`}
        />
        <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
          {isPending ? 'Ajout...' : 'Ajouter'}
        </button>
      </div>
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
    </form>
  )
}

export function BlocValiderOuRejeter({ rapportId }: { rapportId: string }) {
  const [state, formActionValider, isPendingValider] = useActionState(
    validerRapport.bind(null, rapportId),
    etatInitial
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form action={formActionValider} className={classeFormulaire}>
        <p className="text-sm font-semibold text-foreground">Valider le rapport</p>
        <label className="flex flex-col gap-1 text-sm">
          Date de validation
          <input type="date" name="dateValidation" required className={classeChamp} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Auteur de la validation
          <input name="auteurValidation" required placeholder="Le Recteur" className={classeChamp} />
        </label>
        {state.message && <p className="text-destructive text-sm">{state.message}</p>}
        <button type="submit" disabled={isPendingValider} className={classeBoutonPrimaire}>
          {isPendingValider ? 'Validation...' : 'Valider'}
        </button>
      </form>

      <form action={rejeterRapport.bind(null, rapportId)} className={classeFormulaire}>
        <p className="text-sm font-semibold text-foreground">Rejeter</p>
        <label className="flex flex-col gap-1 text-sm">
          Motif
          <textarea name="motif" required rows={3} className={classeChamp} />
        </label>
        <button type="submit" className={classeBoutonDanger}>
          Rejeter
        </button>
      </form>
    </div>
  )
}
