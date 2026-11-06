'use client'

import { useMemo } from 'react'
import { useActionState } from 'react'
import { Trash2 } from 'lucide-react'
import { Alerte } from '@/components/ui/alerte'
import { useReussiteNotifiee } from '@/components/ui/notifications'
import { useConfirmation } from '@/components/ui/confirmation'
import { Recapitulatif, dateEnClair, texteEnClair } from '@/components/ui/recapitulatif'
import { useActionConservee } from '@/lib/action-conservee'
import type { Grade } from '@/generated/prisma/enums'
import {
  ajouterSelection,
  modifierSelection,
  supprimerRapport,
  validerRapport,
  rejeterRapport,
  mettreAJourMetadonneesSession,
  mettreAJourRapport,
  type EtatFormulaireAvancement,
} from './actions'
import {
  classeBoutonDanger,
  classeBoutonPrimaire,
  classeChamp,
  classeFormulaire,
} from '@/lib/ui-classes'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import { valeurChampDate } from '@/domain/dates/valeurChampDate'
import { formaterClasseEchelonIndice } from '@/domain/avancement/formaterClasseEchelonIndice'
import { notesDecisionsDejaProduites } from '@/domain/avancement/decisionsDejaProduites'
import { metadonneesManquantes } from '@/domain/avancement/metadonneesSessionCompletes'

const etatInitial: EtatFormulaireAvancement = {}

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
  decisions,
}: {
  rapportId: string
  metadonnees: MetadonneesSession
  /** Décisions déjà produites pour ce rapport : ce que la modification change pour elles. */
  decisions: { enAttente: number; signees: number }
}) {
  // La page reste affichée après l'enregistrement : le formulaire garde la saisie, qui est la
  // valeur enregistrée, et ne revient pas à l'ancienne quand le serveur refuse une date.
  const [state, surEnvoi, isPending] = useActionConservee(
    useReussiteNotifiee(mettreAJourMetadonneesSession.bind(null, rapportId)),
    etatInitial
  )
  const manquantes = metadonneesManquantes(metadonnees)
  const notes = notesDecisionsDejaProduites(decisions)

  return (
    <form method="post" onSubmit={surEnvoi} className={classeFormulaire}>
      <p className="text-foreground text-sm font-semibold">
        Métadonnées du conseil (pour les décisions individuelles)
      </p>
      <p className="text-muted-foreground text-xs">
        Ces champs alimentent les mentions « Vu la loi de finances », « Vu la circulaire » et les
        dates de session CU/CA dans chaque décision DOCX. Ils peuvent être renseignés en plusieurs
        fois et corrigés à tout moment, y compris après la validation du rapport.
      </p>
      {manquantes.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Il manque encore : {manquantes.join(', ')}. Tant qu’elles manquent, les mentions
          correspondantes restent vides dans les décisions.
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="text-muted-foreground text-xs">
          {note}
        </p>
      ))}
      <label className="flex flex-col gap-1 text-sm">
        Loi de finances
        <input
          name="referenceLoiFinances"
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
            defaultValue={valeurChampDate(metadonnees.dateSessionCU)}
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
            defaultValue={valeurChampDate(metadonnees.dateSessionCA)}
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
          defaultValue={valeurChampDate(metadonnees.dateSignatureDecisions)}
          className={classeChamp}
        />
        {state.errors?.dateSignatureDecisions && (
          <p className="text-destructive text-sm">{state.errors.dateSignatureDecisions[0]}</p>
        )}
      </label>
      {state.message && !state.succes && <Alerte ton="erreur">{state.message}</Alerte>}
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
      {state.message && <Alerte ton="erreur">{state.message}</Alerte>}
    </form>
  )
}

export function FormulaireModifierRapport({
  rapport,
  valide,
}: {
  rapport: { id: string; numero: string; periodeDebut: string; periodeFin: string }
  valide: boolean
}) {
  // Le formulaire reste affiché après l'enregistrement : il garde la saisie (la valeur
  // enregistrée) au lieu de revenir à l'ancienne, ce qui ferait renvoyer l'ancienne période
  // par le bouton « Enregistrer quand même ».
  const [state, surEnvoi, isPending] = useActionConservee(
    useReussiteNotifiee(mettreAJourRapport.bind(null, rapport.id)),
    etatInitial
  )

  return (
    <form method="post" onSubmit={surEnvoi} className={classeFormulaire}>
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
            defaultValue={valeurChampDate(rapport.periodeDebut)}
            className={classeChamp}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fin de période
          <input
            type="date"
            name="periodeFin"
            required
            defaultValue={valeurChampDate(rapport.periodeFin)}
            className={classeChamp}
          />
        </label>
      </div>
      <p className="text-muted-foreground text-sm">
        {valide
          ? 'La fin de période est la date d’effet des avancements de ce rapport. La modifier reporte la nouvelle date sur l’historique et sur les fiches des enseignants, tant qu’aucune décision n’a été générée et que chacun occupe encore la position issue du rapport.'
          : 'Modifier la période ne recalcule pas la liste des enseignants déjà sélectionnés : vérifiez-la ensuite.'}
      </p>
      {state.message && !state.succes && <Alerte ton="erreur">{state.message}</Alerte>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
          {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
        {/* Après l'avertissement de chevauchement (brouillon seulement) : passe outre. */}
        {state.confirmationRequise && (
          <button
            type="submit"
            name="confirmerChevauchement"
            value="oui"
            disabled={isPending}
            className={classeBoutonPrimaire}
          >
            Enregistrer quand même
          </button>
        )}
      </div>
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
    useReussiteNotifiee(modifierSelection.bind(null, rapportId, selectionId)),
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

  // En fin de grille, la liste filtrée est vide : mieux vaut le dire qu'afficher une liste muette.
  if (grille.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucune position supérieure n’est disponible pour cet enseignant.
      </p>
    )
  }

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
        {state.message && !state.succes && <Alerte ton="erreur">{state.message}</Alerte>}
      </div>
    </form>
  )
}

export function FormulaireSupprimerRapport({
  rapportId,
  numero,
  nombreSelections,
}: {
  rapportId: string
  numero: string
  nombreSelections: number
}) {
  const [state, formAction, isPending] = useActionState(
    supprimerRapport.bind(null, rapportId),
    etatInitial
  )
  const confirmation = useConfirmation({
    titre: `Supprimer définitivement le rapport ${numero} ?`,
    description: (
      <>
        {nombreSelections > 0 && (
          <p>
            Ses {nombreSelections} sélection{nombreSelections > 1 ? 's' : ''} d&apos;enseignants
            seront supprimées avec lui.
          </p>
        )}
        <p>Cette action est irréversible.</p>
      </>
    ),
    libelleConfirmer: 'Supprimer le rapport',
    libelleEnCours: 'Suppression…',
    ton: 'danger',
    icone: Trash2,
    enCours: isPending,
  })

  return (
    <>
      <form
        action={formAction}
        onSubmit={confirmation.surEnvoi}
        className="flex flex-col items-end gap-2"
      >
        {state.message && <Alerte ton="erreur">{state.message}</Alerte>}
        <button type="submit" disabled={isPending} className={classeBoutonDanger}>
          {isPending ? 'Suppression…' : 'Supprimer ce rapport'}
        </button>
      </form>
      {confirmation.dialogue}
    </>
  )
}

export function BlocValiderOuRejeter({
  rapportId,
  numero,
  nombreSelections,
}: {
  rapportId: string
  /** Numéro du rapport : rend la question de confirmation précise. */
  numero?: string
  nombreSelections?: number
}) {
  // Le formulaire quitte la page quand la validation réussit : la saisie (date, auteur) est
  // conservée si le serveur répond par la liste des enseignants exclus, pour confirmer sans
  // tout ressaisir.
  const [state, surEnvoiValider, isPendingValider] = useActionConservee(
    validerRapport.bind(null, rapportId),
    etatInitial
  )

  // Valider modifie l'échelon de chaque enseignant retenu et ne se défait pas (un rapport validé
  // ne peut plus être supprimé). Deuxième temps, quand le serveur a signalé des enseignants qui
  // ne peuvent plus avancer : la question porte alors sur eux.
  const exclusions = state.peutConfirmer && state.exclusions ? state.exclusions : null
  const confirmation = useConfirmation({
    titre: exclusions
      ? `Valider le rapport${numero ? ` ${numero}` : ''} sans ${exclusions.length} enseignant${exclusions.length > 1 ? 's' : ''} ?`
      : `Valider le rapport${numero ? ` ${numero}` : ''} ?`,
    description: exclusions ? (
      <p>
        Les enseignants ci-dessous ne peuvent plus avancer : ils seront retirés du rapport, les
        autres passeront à leur nouvel échelon. Cette validation ne se défait pas.
      </p>
    ) : (
      <p>
        Les enseignants retenus passeront à leur nouvel échelon et l&apos;historique des avancements
        sera enregistré. Cette validation ne se défait pas : un rapport validé ne peut plus être
        supprimé.
      </p>
    ),
    libelleConfirmer: exclusions ? 'Valider sans eux' : 'Valider le rapport',
    libelleEnCours: 'Validation…',
    ton: 'avertissement',
    enCours: isPendingValider,
    surEnvoi: surEnvoiValider,
    contenu: exclusions && (
      <ul className="border-border bg-muted/40 flex flex-col gap-1 rounded-xl border p-3 text-sm">
        {exclusions.map((exclusion) => (
          <li key={exclusion.enseignantId}>
            <strong>{exclusion.nom}</strong> ({exclusion.matricule}) — {exclusion.motif}
          </li>
        ))}
      </ul>
    ),
    recapitulatif: (donnees) => (
      <Recapitulatif
        lignes={[
          { libelle: 'Date de validation', valeur: dateEnClair(donnees.get('dateValidation')) },
          { libelle: 'Auteur', valeur: texteEnClair(donnees.get('auteurValidation')) },
          ...(nombreSelections === undefined
            ? []
            : [{ libelle: 'Enseignants sélectionnés', valeur: String(nombreSelections) }]),
        ]}
      />
    ),
  })

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form method="post" onSubmit={confirmation.surEnvoi} className={classeFormulaire}>
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
          {state.message && <Alerte ton="erreur">{state.message}</Alerte>}
          {state.exclusions && state.exclusions.length > 0 && (
            <ul className="border-border bg-muted/30 flex flex-col gap-1 rounded-lg border p-3 text-sm">
              {state.exclusions.map((exclusion) => (
                <li key={exclusion.enseignantId}>
                  <strong>{exclusion.nom}</strong> ({exclusion.matricule}) — {exclusion.motif}
                </li>
              ))}
            </ul>
          )}
          {state.peutConfirmer && state.exclusions && (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">
                Les enseignants ci-dessus seront retirés de ce rapport ; les autres avanceront.
              </p>
              <button
                type="submit"
                name="exclusionsConfirmees"
                value={state.exclusions.map((exclusion) => exclusion.enseignantId).join(',')}
                disabled={isPendingValider}
                className={classeBoutonPrimaire}
              >
                {isPendingValider ? 'Validation...' : 'Valider sans ces enseignants'}
              </button>
            </div>
          )}
          {!state.peutConfirmer && (
            <button type="submit" disabled={isPendingValider} className={classeBoutonPrimaire}>
              {isPendingValider ? 'Validation...' : 'Valider'}
            </button>
          )}
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
      {confirmation.dialogue}
    </>
  )
}
