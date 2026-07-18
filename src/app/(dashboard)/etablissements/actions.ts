'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EtablissementSchema, DepartementSchema } from '@/lib/validations/etablissement'

export type EtatFormulaire = {
  errors?: Record<string, string[]>
  message?: string
}

export async function creerEtablissement(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const parsed = EtablissementSchema.safeParse({
    nom: formData.get('nom'),
    abreviation: formData.get('abreviation'),
    type: formData.get('type'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    await prisma.etablissement.create({ data: parsed.data })
  } catch {
    // Erreur la plus probable : @@unique sur abreviation déjà violée.
    return { message: 'Cette abréviation est déjà utilisée par un autre établissement.' }
  }

  revalidatePath('/etablissements')
  redirect('/etablissements')
}

export async function modifierEtablissement(
  id: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const parsed = EtablissementSchema.safeParse({
    nom: formData.get('nom'),
    abreviation: formData.get('abreviation'),
    type: formData.get('type'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    await prisma.etablissement.update({ where: { id }, data: parsed.data })
  } catch {
    return { message: 'Cette abréviation est déjà utilisée par un autre établissement.' }
  }

  revalidatePath('/etablissements')
  redirect(`/etablissements/${id}`)
}

export async function supprimerEtablissement(
  id: string,
  _prevState: EtatFormulaire,
  _formData: FormData
): Promise<EtatFormulaire> {
  const departements = await prisma.departement.count({ where: { etablissementId: id } })
  if (departements > 0) {
    return {
      message: `Impossible de supprimer : ${departements} département(s) rattaché(s) à cet établissement.`,
    }
  }

  await prisma.etablissement.delete({ where: { id } })
  revalidatePath('/etablissements')
  redirect('/etablissements')
}

export async function creerDepartement(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const parsed = DepartementSchema.safeParse({
    nom: formData.get('nom'),
    abreviation: formData.get('abreviation'),
    etablissementId: formData.get('etablissementId'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    await prisma.departement.create({ data: parsed.data })
  } catch {
    return { message: 'Ce nom ou cette abréviation existe déjà pour cet établissement.' }
  }

  revalidatePath(`/etablissements/${parsed.data.etablissementId}`)
  return { message: 'Département ajouté.' }
}
