'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EnseignantSchema, TransfertSchema, RetraiteSchema } from '@/lib/validations/enseignant'

export type EtatFormulaire = {
  errors?: Record<string, string[]>
  message?: string
}

/**
 * Résout la position choisie dans le formulaire. On ne fait jamais
 * confiance à un grade/voie envoyé par le client : ils sont toujours
 * redérivés ici, à partir de la ligne de grille réellement trouvée en
 * base — jamais depuis une valeur soumise par le navigateur.
 */
async function resoudrePosition(positionActuelleId: string) {
  return prisma.echelonIndiciaire.findUnique({ where: { id: positionActuelleId } })
}

export async function creerEnseignant(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const parsed = EnseignantSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { positionActuelleId, ...donnees } = parsed.data
  const position = await resoudrePosition(positionActuelleId)
  if (!position) {
    // Cas rare (grille modifiée entre le chargement du formulaire et
    // l'envoi) : un message clair plutôt qu'une exception qui remonterait
    // hors de ce bloc et ferait planter la Server Action.
    return { message: 'Position de grille invalide — rechargez la page et réessayez.' }
  }

  try {
    await prisma.enseignant.create({
      data: {
        ...donnees,
        grade: position.grade,
        positionActuelleId: position.id,
      },
    })
  } catch {
    return { message: 'Ce matricule existe déjà.' }
  }

  revalidatePath('/enseignants')
  redirect('/enseignants')
}

export async function modifierEnseignant(
  id: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const parsed = EnseignantSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { positionActuelleId, ...donnees } = parsed.data
  const position = await resoudrePosition(positionActuelleId)
  if (!position) {
    return { message: 'Position de grille invalide — rechargez la page et réessayez.' }
  }

  try {
    await prisma.enseignant.update({
      where: { id },
      data: {
        ...donnees,
        grade: position.grade,
        positionActuelleId: position.id,
      },
    })
  } catch {
    return { message: 'Ce matricule existe déjà pour un autre enseignant.' }
  }

  revalidatePath('/enseignants')
  redirect(`/enseignants/${id}`)
}

export async function marquerTransfere(
  id: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const parsed = TransfertSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  await prisma.enseignant.update({
    where: { id },
    data: { statut: 'TRANSFERE', dateFinService: parsed.data.dateFinService },
  })

  revalidatePath('/enseignants')
  revalidatePath(`/enseignants/${id}`)
  return { message: 'Enseignant marqué comme transféré.' }
}

export async function marquerRetraite(
  id: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const parsed = RetraiteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  await prisma.enseignant.update({
    where: { id },
    data: { statut: 'RETRAITE', dateFinService: parsed.data.dateFinService },
  })

  revalidatePath('/enseignants')
  revalidatePath(`/enseignants/${id}`)
  return { message: 'Enseignant marqué comme retraité.' }
}

export async function reactiverEnseignant(
  id: string,
  _prevState: EtatFormulaire,
  _formData: FormData
): Promise<EtatFormulaire> {
  await prisma.enseignant.update({
    where: { id },
    data: { statut: 'ACTIF', dateFinService: null },
  })
  revalidatePath('/enseignants')
  revalidatePath(`/enseignants/${id}`)
  return { message: 'Enseignant réactivé.' }
}
