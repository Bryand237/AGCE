import { z } from 'zod'

export const AbsenceSchema = z.object({
  matricule: z.string().min(1, 'Le matricule est obligatoire'),
  type: z.enum(['MISSION', 'CONGE_MATERNITE', 'CONGE_MALADIE']),
  dateDebut: z.coerce.date(),
  dateFin: z.coerce.date().optional(),
  motif: z.string().optional(),
})