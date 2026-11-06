import type { AbsenceAJuger } from './etapesAbsence'
import { TYPES_AVEC_ATTESTATION } from './typesAvecAttestation'

/**
 * Ce que la fiche d'une absence montre de son attestation.
 *
 *   - `etapes`       : l'absence est en cours (en période ou dépassée) et son type comporte une
 *                      attestation : on propose les étapes (générer le brouillon, le télécharger,
 *                      le marquer signé) et, une fois l'attestation signée, son téléchargement ;
 *   - `consultation` : l'absence n'est plus en cours (elle est terminée) mais une attestation
 *                      existe : plus aucune étape n'est possible, le document reste téléchargeable ;
 *   - `aucune`       : rien à montrer (pas d'attestation pour ce type, ou pas encore générée).
 *
 * Règle de fond : un document enregistré ne cesse jamais d'être accessible. Le bloc s'effaçait
 * auparavant dès que l'absence était terminée, et avec lui le lien de téléchargement d'une
 * attestation pourtant signée.
 */
export type PresentationAttestation = 'etapes' | 'consultation' | 'aucune'

export function presentationAttestation(absence: AbsenceAJuger): PresentationAttestation {
  const enCours = absence.statut === 'EN_PERIODE' || absence.statut === 'DEPASSE'
  if (enCours && TYPES_AVEC_ATTESTATION.includes(absence.type)) return 'etapes'
  return absence.statutAttestation === null ? 'aucune' : 'consultation'
}
