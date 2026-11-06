'use client'

import { useActionState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  validerAbsence,
  terminerAbsence,
  modifierAbsence,
  supprimerAbsence,
  genererAttestation,
  validerAttestation,
} from './actions'
import type { EtatFormulaire } from '@/lib/formulaires'
import { Alerte } from '@/components/ui/alerte'
import { useReussiteNotifiee } from '@/components/ui/notifications'
import { useConfirmation } from '@/components/ui/confirmation'
import { Recapitulatif, dateEnClair, texteEnClair } from '@/components/ui/recapitulatif'
import { classeBoutonPrimaire, classeChamp, classeFormulaire } from '@/lib/ui-classes'
import { lireMotifMission } from '@/domain/absences/motifMission'
import { ChampsMission } from './champs-mission'

const etatInitial: EtatFormulaire = {}

export function FormulaireValidationAbsence({
  absenceId,
  avecAttestation,
}: {
  absenceId: string
  /** La décision citera la correspondance et la demande de l'intéressé(e) : on les demande ici. */
  avecAttestation: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    validerAbsence.bind(null, absenceId),
    etatInitial
  )
  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-foreground text-sm font-semibold">Valider la demande</p>
      <label className="flex flex-col gap-1 text-sm">
        Date de validation
        <input type="date" name="dateValidation" required className={classeChamp} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Auteur de la validation
        <input name="auteurValidation" required placeholder="Le Recteur" className={classeChamp} />
      </label>
      {avecAttestation && (
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
      {state.message && <Alerte ton="erreur">{state.message}</Alerte>}
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
  // Une absence terminée ne se modifie plus : une date de retour erronée ne se corrige pas.
  const confirmation = useConfirmation({
    titre: 'Enregistrer le retour de l’enseignant ?',
    description: 'L’absence passera à « Terminée » et ne pourra plus être modifiée.',
    libelleConfirmer: 'Enregistrer le retour',
    libelleEnCours: 'Enregistrement…',
    ton: 'avertissement',
    enCours: isPending,
    recapitulatif: (donnees) => (
      <Recapitulatif
        lignes={[{ libelle: 'Date de retour', valeur: dateEnClair(donnees.get('dateRetour')) }]}
      />
    ),
  })
  return (
    <>
      <form action={formAction} onSubmit={confirmation.surEnvoi} className={classeFormulaire}>
        <p className="text-foreground text-sm font-semibold">
          {estDepasse ? 'Enseignant de retour (durée dépassée)' : "Marquer l'enseignant de retour"}
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Date de retour
          <input type="date" name="dateRetour" required className={classeChamp} />
        </label>
        {state.message && <Alerte ton="erreur">{state.message}</Alerte>}
        <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
          {isPending ? 'Enregistrement...' : 'Marquer terminé'}
        </button>
      </form>
      {confirmation.dialogue}
    </>
  )
}

export function FormulaireModifierAbsence({
  absenceId,
  type,
  dateDebut,
  dateFin,
  motif,
}: {
  absenceId: string
  type: string
  dateDebut: string
  dateFin: string
  motif: string | null
}) {
  // Pour une mission, le motif enregistré porte l'établissement d'accueil et l'objet.
  const mission = lireMotifMission(motif)
  const [state, formAction, isPending] = useActionState(
    modifierAbsence.bind(null, absenceId),
    etatInitial
  )

  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-foreground text-sm font-semibold">Modifier l’absence</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Date de début
          <input
            type="date"
            name="dateDebut"
            defaultValue={dateDebut}
            required
            className={classeChamp}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date de fin
          <input
            type="date"
            name="dateFin"
            defaultValue={dateFin}
            required
            className={classeChamp}
          />
        </label>
      </div>
      {type === 'MISSION' ? (
        <ChampsMission lieuAccueil={mission.lieuAccueil} objet={mission.objet} />
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Motif
          <textarea name="motif" rows={3} defaultValue={motif ?? ''} className={classeChamp} />
        </label>
      )}
      {state.message && <Alerte ton="erreur">{state.message}</Alerte>}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  )
}

const classeLienTelechargement = 'text-primary text-sm font-medium hover:underline'
const classeNoteAttestation = 'text-muted-foreground text-xs'

/**
 * L'attestation d'une absence. En `consultationSeule` (absence terminée), aucune étape n'est
 * proposée, mais le document enregistré reste téléchargeable : `signature` (« Signée le … ») et
 * `raisonBrouillon` (pourquoi un brouillon ne peut plus être signé) sont des textes déjà prêts.
 */
export function BlocAttestationAbsence({
  absenceId,
  statutAttestation,
  numeroDecision,
  consultationSeule = false,
  signature = null,
  raisonBrouillon = null,
  raisonGeneration = null,
}: {
  absenceId: string
  statutAttestation: string | null
  numeroDecision: string | null
  consultationSeule?: boolean
  signature?: string | null
  raisonBrouillon?: string | null
  /** Ce qui manque avant de pouvoir générer le brouillon (mission sans lieu d'accueil ou objet). */
  raisonGeneration?: string | null
}) {
  const [etatGenerer, formActionGenerer, isPendingGenerer] = useActionState(
    useReussiteNotifiee(genererAttestation.bind(null, absenceId)),
    etatInitial
  )
  const [state, formActionValider, isPending] = useActionState(
    useReussiteNotifiee(validerAttestation.bind(null, absenceId)),
    etatInitial
  )
  // Une attestation signée fige l'absence : ni suppression, ni changement de dates ensuite.
  const confirmation = useConfirmation({
    titre: 'Marquer l’attestation comme signée ?',
    description:
      'Elle sera refaite avec le numéro et la date saisis. Ensuite, l’absence ne pourra plus être supprimée ni voir ses dates modifiées.',
    libelleConfirmer: 'Marquer signée',
    libelleEnCours: 'Enregistrement…',
    ton: 'avertissement',
    enCours: isPending,
    recapitulatif: (donnees) => (
      <Recapitulatif
        lignes={[
          { libelle: 'Numéro de décision', valeur: texteEnClair(donnees.get('numeroDecision')) },
          { libelle: 'Date de validation', valeur: dateEnClair(donnees.get('dateValidation')) },
          { libelle: 'Auteur', valeur: texteEnClair(donnees.get('auteurValidation')) },
        ]}
      />
    ),
  })

  if (!statutAttestation) {
    if (consultationSeule) return null
    if (raisonGeneration) return <p className="text-muted-foreground text-sm">{raisonGeneration}</p>
    return (
      <form action={formActionGenerer} className="flex flex-col gap-2">
        {etatGenerer.message && !etatGenerer.succes && (
          <Alerte ton="erreur">{etatGenerer.message}</Alerte>
        )}
        <button type="submit" disabled={isPendingGenerer} className={classeBoutonPrimaire}>
          {isPendingGenerer ? 'Génération...' : "Générer le brouillon d'attestation"}
        </button>
      </form>
    )
  }
  if (statutAttestation === 'EN_ATTENTE') {
    const lienBrouillon = (
      <a href={`/absences/${absenceId}/attestation`} download className={classeLienTelechargement}>
        Télécharger le brouillon
      </a>
    )
    if (consultationSeule) {
      return (
        <div className="flex flex-col gap-1">
          {lienBrouillon}
          {raisonBrouillon && <p className={classeNoteAttestation}>{raisonBrouillon}</p>}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        {lienBrouillon}
        <form
          action={formActionValider}
          onSubmit={confirmation.surEnvoi}
          className="flex flex-col gap-3"
        >
          <p className="text-muted-foreground text-sm">
            Le numéro et la date saisis sont imprimés sur l&apos;attestation, qui est refaite à la
            signature.
          </p>
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
          {state.message && !state.succes && <Alerte ton="erreur">{state.message}</Alerte>}
          <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
            {isPending ? 'Enregistrement...' : 'Marquer signée'}
          </button>
        </form>
        {confirmation.dialogue}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <a href={`/absences/${absenceId}/attestation`} download className={classeLienTelechargement}>
        Télécharger l&apos;attestation n°{numeroDecision}
      </a>
      {signature && <p className={classeNoteAttestation}>{signature}</p>}
    </div>
  )
}

export function FormulaireSupprimerAbsence({ absenceId }: { absenceId: string }) {
  const [state, formAction, isPending] = useActionState(
    supprimerAbsence.bind(null, absenceId),
    etatInitial
  )
  // Une suppression est définitive : le brouillon d'attestation et l'historique de l'absence
  // disparaissent avec elle.
  const confirmation = useConfirmation({
    titre: 'Supprimer définitivement cette absence ?',
    description:
      "Le brouillon d'attestation et l'historique de cette absence seront supprimés avec elle. Cette action est irréversible.",
    libelleConfirmer: "Supprimer l'absence",
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
        className="flex flex-col items-center gap-2"
      >
        <button
          type="submit"
          disabled={isPending}
          className="border-border bg-card text-destructive hover:bg-destructive/5 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm disabled:opacity-50"
        >
          <Trash2 size={14} />
          {isPending ? 'Suppression...' : 'Supprimer'}
        </button>
        {state.message && (
          <Alerte ton="erreur" className="max-w-60 px-3 py-2 text-xs">
            {state.message}
          </Alerte>
        )}
      </form>
      {confirmation.dialogue}
    </>
  )
}
