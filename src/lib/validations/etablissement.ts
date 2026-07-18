import { z } from 'zod'

export const EtablissementSchema = z.object({
  nom: z.string().min(2, 'Le nom est obligatoire'),
  abreviation: z
    .string()
    .min(2, "L'abréviation est obligatoire")
    .max(15, "L'abréviation ne doit pas dépasser 15 caractères")
    .transform((v) => v.toUpperCase()),
  type: z.enum(['ECOLE', 'FACULTE'], {
    message: 'Le type doit être École ou Faculté',
  }),
})

export type EtablissementInput = z.infer<typeof EtablissementSchema>

export const DepartementSchema = z.object({
  nom: z.string().min(2, 'Le nom est obligatoire'),
  abreviation: z
    .string()
    .min(1, "L'abréviation est obligatoire")
    .max(15)
    .transform((v) => v.toUpperCase()),
  etablissementId: z.string().uuid("Établissement invalide"),
})

export type DepartementInput = z.infer<typeof DepartementSchema>
