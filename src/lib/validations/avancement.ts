import { z } from 'zod'
import { date, texteObligatoire } from './champs'

// Les métadonnées du conseil peuvent manquer à la création d'un rapport et se compléter plus
// tard : un champ laissé vide vaut `null`, et non `undefined`, car Prisma ignore `undefined` :
// avec lui, une valeur devenue caduque ne pourrait plus être retirée.
const texteOuNull = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

// Saisie, la date doit être lisible ; absente ou vide, elle vaut `null`.
const dateOuNull = (libelle: string) =>
  z
    .preprocess((v) => (v === '' ? undefined : v), date(libelle).optional())
    .transform((v) => v ?? null)

export const MetadonneesSessionSchema = z.object({
  referenceLoiFinances: texteOuNull,
  referenceCirculaire: texteOuNull,
  dateSessionCU: dateOuNull('La date de la session du Conseil universitaire'),
  dateSessionCA: dateOuNull("La date de la session du Conseil d'administration"),
  dateSignatureDecisions: dateOuNull('La date de signature des décisions'),
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
