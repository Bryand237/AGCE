import type { StatutAbsence, TypeAbsence } from '../enseignants/dossier'
import { TYPES_AVEC_ATTESTATION, TYPES_RETOUR_APRES_ATTESTATION } from './typesAvecAttestation'

/**
 * L'ordre des étapes de la vie d'une absence, imposé par le serveur.
 *
 *   en attente ──valider──▶ en période / dépassée ──terminer──▶ terminée
 *                                │
 *                                └─ (congés et missions) générer le brouillon d'attestation
 *                                   ──valider l'attestation──▶ attestation signée
 *
 * Le retour d'un congé exige l'attestation signée ; celui d'une mission ne l'exige pas.
 *
 * Une action serveur est une adresse HTTP appelable sans passer par la page : un onglet resté
 * ouvert ou un double envoi peut déclencher une étape que la page ne propose plus (re-valider,
 * rouvrir une absence terminée, changer les dates d'une absence dont l'attestation Word a déjà
 * été générée avec les anciennes). Chaque action relit l'état ENREGISTRÉ et passe par cette
 * fonction, qui renvoie le message à afficher quand l'étape est refusée, ou `undefined`.
 */
export type EtapeAbsence =
  | 'valider'
  | 'terminer'
  | 'modifier'
  | 'supprimer'
  | 'genererAttestation'
  | 'validerAttestation'

export type StatutAttestationAbsence = 'EN_ATTENTE' | 'VALIDEE'

/** Ce qu'il faut savoir d'une absence pour juger une étape. */
export type AbsenceAJuger = {
  statut: StatutAbsence
  type: TypeAbsence
  statutAttestation: StatutAttestationAbsence | null
}

const SANS_ATTESTATION = "Ce type d'absence n'a pas d'attestation."

export function erreurEtapeAbsence(
  etape: EtapeAbsence,
  absence: AbsenceAJuger
): string | undefined {
  const { statut, type, statutAttestation } = absence
  const avecAttestation = TYPES_AVEC_ATTESTATION.includes(type)
  const enCours = statut === 'EN_PERIODE' || statut === 'DEPASSE'

  switch (etape) {
    case 'valider':
      if (statut === 'EN_ATTENTE') return undefined
      return statut === 'TERMINE'
        ? 'Cette absence est terminée : elle ne peut plus être validée.'
        : 'Cette absence est déjà validée.'

    case 'terminer':
      if (statut === 'TERMINE') return 'Le retour de cette absence est déjà enregistré.'
      if (statut === 'EN_ATTENTE') {
        return "Cette absence n'est pas encore validée : validez-la avant d'enregistrer le retour."
      }
      // Un congé ne se clôt qu'une fois son attestation signée (pas une mission).
      if (TYPES_RETOUR_APRES_ATTESTATION.includes(type) && statutAttestation !== 'VALIDEE') {
        return "La fin d'absence ne peut être enregistrée qu'après validation de l'attestation."
      }
      return undefined

    case 'modifier':
      if (statut === 'TERMINE')
        return 'Cette absence est terminée : elle ne peut plus être modifiée.'
      if (statutAttestation === 'VALIDEE') {
        return 'Une attestation signée a été établie pour cette absence : ses dates ne peuvent plus être modifiées.'
      }
      if (statutAttestation === 'EN_ATTENTE') {
        return "Un brouillon d'attestation a été généré avec les dates actuelles : elles ne peuvent plus être modifiées. Pour les corriger, supprimez l'absence et recréez-la."
      }
      return undefined

    case 'supprimer':
      return statutAttestation === 'VALIDEE'
        ? 'Une attestation signée existe pour cette absence : elle ne peut pas être supprimée.'
        : undefined

    case 'genererAttestation':
      if (!avecAttestation) return SANS_ATTESTATION
      if (!enCours) {
        return statut === 'TERMINE'
          ? "Cette absence est terminée : l'attestation ne peut plus être générée."
          : "L'attestation se génère après la validation de l'absence."
      }
      return statutAttestation === null
        ? undefined
        : 'Une attestation existe déjà pour cette absence.'

    case 'validerAttestation':
      if (!avecAttestation) return SANS_ATTESTATION
      if (!enCours) {
        return statut === 'TERMINE'
          ? "Cette absence est terminée : l'attestation ne peut plus être validée."
          : "L'attestation se valide après la validation de l'absence."
      }
      if (statutAttestation === null) return "Générez d'abord le brouillon de l'attestation."
      return statutAttestation === 'VALIDEE' ? "L'attestation est déjà validée." : undefined
  }
}
