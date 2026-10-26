// src/domain/absences/typesAvecAttestation.ts

/**
 * Les types d'absence pour lesquels l'application produit une décision du Recteur à partir d'un
 * gabarit Word (`templates/`) : brouillon à télécharger, puis signature enregistrée.
 */
export const TYPES_AVEC_ATTESTATION = ['CONGE_MATERNITE', 'CONGE_MALADIE', 'MISSION']

/**
 * Parmi eux, ceux dont le retour ne s'enregistre qu'une fois l'attestation signée : les congés.
 * Une mission peut se terminer sans attestation signée (règle antérieure à l'attestation de
 * mission : elle ne change pas pour les missions déjà enregistrées).
 */
export const TYPES_RETOUR_APRES_ATTESTATION = ['CONGE_MATERNITE', 'CONGE_MALADIE']
