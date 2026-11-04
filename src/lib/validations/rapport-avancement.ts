import { z } from 'zod'
import { date, texteObligatoire } from './champs'

/**
 * Saisies des actions sur un rapport d'avancement en cours : validation du rapport, ajout d'un
 * enseignant, position proposée, rejet. Chacune est lue par un schéma (audit E4) : un champ
 * absent ou illisible est refusé avec un message qui le nomme, au lieu d'être converti
 * silencieusement (`new Date(null)` donnait le 1er janvier 1970).
 */

/** Validation d'un rapport : la date et l'auteur de la validation, et les exclusions déjà acceptées. */
export const ValidationRapportSchema = z.object({
  dateValidation: date('La date de validation'),
  auteurValidation: texteObligatoire("L'auteur de la validation est obligatoire"),
  // Identifiants séparés par des virgules (la liste que l'utilisateur a vue et acceptée).
  exclusionsConfirmees: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((identifiant) => identifiant.trim())
        .filter(Boolean)
    ),
})

/** Ajout d'un enseignant à un rapport. */
export const SelectionEnseignantSchema = z.object({
  enseignantId: texteObligatoire('Veuillez sélectionner un enseignant.'),
})

/** Position proposée pour une sélection. */
export const PositionProposeeSchema = z.object({
  positionProposeeId: texteObligatoire('Veuillez choisir une position proposée valide.'),
})

/** Motif de rejet d'un rapport. */
export const RejetRapportSchema = z.object({
  motif: texteObligatoire('Le motif du rejet est obligatoire.'),
})
