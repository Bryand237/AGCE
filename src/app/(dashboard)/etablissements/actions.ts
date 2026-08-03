'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EtablissementSchema, DepartementSchema } from '@/lib/validations/etablissement'
import fs from 'fs/promises'
import path from 'path'

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
    const created = await prisma.etablissement.create({ data: parsed.data })

    const photo = formData.get('photo') as File | null
    if (photo && (photo as any).size) {
      try {
        const buffer = Buffer.from(await (photo as any).arrayBuffer())
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'etablissements')
        await fs.mkdir(uploadsDir, { recursive: true })
        const ext = (photo as any).type?.split('/')[1] || 'jpg'
        const filename = `${created.id}.${ext}`
        const filepath = path.join(uploadsDir, filename)
        await fs.writeFile(filepath, buffer)
        const url = `/uploads/etablissements/${filename}`
        await prisma.etablissement.update({ where: { id: created.id }, data: { photoUrl: url } })
      } catch {
        return { message: "Établissement créé, mais échec lors de l'enregistrement de la photo." }
      }
    }
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
    const etablissementExistant = await prisma.etablissement.findUnique({ where: { id } })

    await prisma.etablissement.update({ where: { id }, data: parsed.data })

    const removePhoto = (formData.get('removePhoto') as string | null) === 'on'
    if (removePhoto && etablissementExistant?.photoUrl) {
      try {
        const existingPath = path.join(
          process.cwd(),
          'public',
          etablissementExistant.photoUrl.replace(/^\//, '')
        )
        await fs.unlink(existingPath).catch(() => {})
      } catch {}
      await prisma.etablissement.update({ where: { id }, data: { photoUrl: null } })
    }

    const photo = formData.get('photo') as File | null
    if (photo && (photo as any).size) {
      try {
        if (etablissementExistant?.photoUrl) {
          const existingPath = path.join(
            process.cwd(),
            'public',
            etablissementExistant.photoUrl.replace(/^\//, '')
          )
          await fs.unlink(existingPath).catch(() => {})
        }

        const buffer = Buffer.from(await (photo as any).arrayBuffer())
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'etablissements')
        await fs.mkdir(uploadsDir, { recursive: true })
        const ext = (photo as any).type?.split('/')[1] || 'jpg'
        const filename = `${id}.${ext}`
        const filepath = path.join(uploadsDir, filename)
        await fs.writeFile(filepath, buffer)
        const url = `/uploads/etablissements/${filename}`
        await prisma.etablissement.update({ where: { id }, data: { photoUrl: url } })
      } catch {
        return {
          message: "Modifications enregistrées, mais échec lors de l'enregistrement de la photo.",
        }
      }
    }
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
