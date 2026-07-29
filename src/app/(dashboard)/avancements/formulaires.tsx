'use client'

import { useMemo } from 'react'
import { useActionState } from 'react'
import type { Grade } from '@/generated/prisma/enums'
import {
  ajouterSelection,
  modifierSelection,
  supprimerRapport,
  validerRapport,
  rejeterRapport,
  mettreAJourMetadonneesSession,
  mettreAJourRapport,
  type EtatFormulaire,
} from './actions'
import {
  classeBoutonDanger,
  classeBoutonPrimaire,
  classeChamp,
  classeFormulaire,
} from '@/lib/ui-classes'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import { formaterClasseEchelonIndice } from '@/domain/avancement/formaterClasseEchelonIndice'

const etatInitial: EtatFormulaire = {}

function formatDateInput(d: Date | string | null | undefined) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().slice(0, 10)
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
        <p className="text-foreground text-sm font-semibold">Métadonnées du conseil</p>
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
            <dd>{metadonnees.dateSessionCU?.toLocaleDateString('fr-FR') ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Session CA</dt>
            <dd>{metadonnees.dateSessionCA?.toLocaleDateString('fr-FR') ?? '—'}</dd>
          </div>
        </dl>
      </div>
    )
  }

  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-foreground text-sm font-semibold">
        Métadonnées du conseil (pour les décisions individuelles)
      </p>
      <p className="text-muted-foreground text-xs">
        Ces champs alimentent les mentions « Vu la loi de finances », « Vu la circulaire » et les
        dates de session CU/CA dans chaque décision DOCX.
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

type EnseignantActif = {
  id: string
  matricule: string
  nom: string
  prenom: string
}

export function FormulaireAjouterEnseignant({
  rapportId,
  enseignants,
}: {
  rapportId: string
  enseignants: EnseignantActif[]
}) {
  const [state, formAction, isPending] = useActionState(
    ajouterSelection.bind(null, rapportId),
    etatInitial
  )

  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-foreground text-sm font-semibold">Ajouter un enseignant</p>
      <label className="flex flex-col gap-1 text-sm">
        Enseignant
        <select name="enseignantId" required className={classeChamp}>
          <option value="">Sélectionnez un enseignant</option>
          {enseignants.map((enseignant) => (
            <option key={enseignant.id} value={enseignant.id}>
              {enseignant.nom} {enseignant.prenom} — {enseignant.matricule}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Ajout...' : 'Ajouter'}
      </button>
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
    </form>
  )
}

export function FormulaireModifierRapport({
  rapport,
}: {
  rapport: { id: string; numero: string; periodeDebut: string; periodeFin: string }
}) {
  const [state, formAction, isPending] = useActionState(
    mettreAJourRapport.bind(null, rapport.id),
    etatInitial
  )

  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-foreground text-sm font-semibold">Modifier le rapport</p>
      <label className="flex flex-col gap-1 text-sm">
        Numéro de session
        <input name="numero" required defaultValue={rapport.numero} className={classeChamp} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Début de période
          <input
            type="date"
            name="periodeDebut"
            required
            defaultValue={formatDateInput(rapport.periodeDebut)}
            className={classeChamp}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fin de période
          <input
            type="date"
            name="periodeFin"
            required
            defaultValue={formatDateInput(rapport.periodeFin)}
            className={classeChamp}
          />
        </label>
      </div>
      {state.message && <p className="text-muted-foreground text-sm">{state.message}</p>}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </form>
  )
}

type LigneGrille = {
  id: string
  grade: Grade
  voie: string | null
  sousCategorie: string | null
  classe: number | null
  echelon: number | null
  indice: number
}

export function FormulaireModifierSelection({
  rapportId,
  selectionId,
  positionProposeeId,
  grille,
}: {
  rapportId: string
  selectionId: string
  positionProposeeId: string
  grille: LigneGrille[]
}) {
  const [state, formAction, isPending] = useActionState(
    modifierSelection.bind(null, rapportId, selectionId),
    etatInitial
  )

  const positionsParGrade = useMemo(() => {
    const map = new Map<string, LigneGrille[]>()
    for (const position of grille) {
      const nomGrade = LIBELLES_GRADE[position.grade] ?? position.grade
      const groupe = map.get(nomGrade) ?? []
      groupe.push(position)
      map.set(nomGrade, groupe)
    }
    return [...map.entries()]
  }, [grille])

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <select name="positionProposeeId" defaultValue={positionProposeeId} className={classeChamp}>
        {positionsParGrade.map(([nomGrade, positions]) => (
          <optgroup key={nomGrade} label={nomGrade}>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {formaterClasseEchelonIndice(position)} — {position.indice}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
          {isPending ? 'Modification…' : 'Mettre à jour'}
        </button>
        {state.message && <p className="text-muted-foreground text-sm">{state.message}</p>}
      </div>
    </form>
  )
}

export function FormulaireSupprimerRapport({ rapportId }: { rapportId: string }) {
  const [, formAction] = useActionState(
    supprimerRapport.bind(null, rapportId),
    undefined as unknown as void
  )

  return (
    <form action={formAction} className="flex items-center justify-end">
      <button type="submit" className={classeBoutonDanger}>
        Supprimer ce rapport
      </button>
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
        <p className="text-foreground text-sm font-semibold">Valider le rapport</p>
        <label className="flex flex-col gap-1 text-sm">
          Date de validation
          <input type="date" name="dateValidation" required className={classeChamp} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Auteur de la validation
          <input
            name="auteurValidation"
            required
            placeholder="Le Recteur"
            className={classeChamp}
          />
        </label>
        {state.message && <p className="text-destructive text-sm">{state.message}</p>}
        <button type="submit" disabled={isPendingValider} className={classeBoutonPrimaire}>
          {isPendingValider ? 'Validation...' : 'Valider'}
        </button>
      </form>

      <form action={rejeterRapport.bind(null, rapportId)} className={classeFormulaire}>
        <p className="text-foreground text-sm font-semibold">Rejeter</p>
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
