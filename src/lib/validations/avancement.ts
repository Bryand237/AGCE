import { z } from 'zod'
import { date, texteObligatoire } from './champs'

// Une date de signature laissée vide reste « absente » (undefined) ; saisie, elle doit être lisible.
const dateOptionnelle = z.preprocess(
  (v) => (v === '' ? undefined : v),
  date('La date de signature des décisions').optional()
)

export const MetadonneesSessionSchema = z.object({
  referenceLoiFinances: texteObligatoire('La loi de finances est obligatoire'),
  referenceCirculaire: texteObligatoire('La circulaire est obligatoire'),
  dateSessionCU: date('La date de la session du Conseil universitaire'),
  dateSessionCA: date("La date de la session du Conseil d'administration"),
  dateSignatureDecisions: dateOptionnelle,
})

/** Création et modification d'un rapport : édition (numéro de session) et période couverte. */
export const RapportSchema = z
  .object({
    numero: texteObligatoire("L'édition (numéro de session) est obligatoire."),
    periodeDebut: date('Le début de période'),
    periodeFin: date('La fin de période'),
  })
  .superRefine((r, ctx) => {
    // Une période inversée ne propose aucun candidat, sans que rien ne l'explique.
    if (r.periodeFin.getTime() < r.periodeDebut.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['periodeFin'],
        message: 'La fin de période ne peut pas précéder son début.',
      })
    }
  })

export const ValidationDecisionSchema = z.object({
  numeroDecision: texteObligatoire('Le numéro de décision est obligatoire'),
  dateValidation: date('La date de validation'),
  auteurValidation: texteObligatoire("L'auteur est obligatoire"),
})
