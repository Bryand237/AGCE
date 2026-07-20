import { z } from 'zod'

const dateOptionnelle = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined))

export const MetadonneesSessionSchema = z.object({
  referenceLoiFinances: z.string().min(1, 'La loi de finances est obligatoire'),
  referenceCirculaire: z.string().min(1, 'La circulaire est obligatoire'),
  dateSessionCU: z.coerce.date(),
  dateSessionCA: z.coerce.date(),
  dateSignatureDecisions: dateOptionnelle,
})

export const ValidationDecisionSchema = z.object({
  numeroDecision: z.string().min(1, 'Le numéro de décision est obligatoire'),
  dateValidation: z.coerce.date(),
  auteurValidation: z.string().min(1, "L'auteur est obligatoire"),
})
