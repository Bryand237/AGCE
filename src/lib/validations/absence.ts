import { z } from 'zod'
import { date, texteObligatoire } from './champs'

const TYPES = ['MISSION', 'CONGE_MATERNITE', 'CONGE_MALADIE'] as const

const FIN_AVANT_DEBUT = 'La date de fin ne peut pas précéder la date de début.'

export const AbsenceSchema = z
  .object({
    matricule: texteObligatoire('Le matricule est obligatoire'),
    type: z.enum(TYPES, { errorMap: () => ({ message: "Le type d'absence est obligatoire." }) }),
    dateDebut: date('La date de début'),
    // Facultative : un congé de maternité reçoit une fin calculée par l'application.
    dateFin: date('La date de fin').optional(),
    motif: z.string().optional(),
    // Mission : établissement d'accueil et objet, enregistrés ensemble dans le motif.
    lieuAccueil: z.string().optional(),
    objetMission: z.string().optional(),
  })
  .superRefine((a, ctx) => {
    if (a.dateFin && a.dateFin.getTime() < a.dateDebut.getTime()) {
      ctx.addIssue({ code: 'custom', path: ['dateFin'], message: FIN_AVANT_DEBUT })
    }
  })

/** Modification d'une absence existante : les deux dates sont obligatoires. */
export const ModificationAbsenceSchema = z
  .object({
    dateDebut: date('La date de début'),
    dateFin: date('La date de fin'),
    motif: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null),
    // Mission : établissement d'accueil et objet, enregistrés ensemble dans le motif.
    lieuAccueil: z.string().optional(),
    objetMission: z.string().optional(),
  })
  .superRefine((a, ctx) => {
    if (a.dateFin.getTime() < a.dateDebut.getTime()) {
      ctx.addIssue({ code: 'custom', path: ['dateFin'], message: FIN_AVANT_DEBUT })
    }
  })

/** Retour d'une absence. La comparaison avec le début de l'absence se fait dans l'action. */
export const RetourAbsenceSchema = z.object({
  dateRetour: date('La date de retour'),
})
