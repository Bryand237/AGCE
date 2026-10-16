'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigerUtilisateur } from '@/lib/auth'
import { analyserErreur, messageErreur } from '@/lib/erreurs'
import { EtablissementSchema, DepartementSchema } from '@/lib/validations/etablissement'
import fs from 'fs/promises'
import path from 'path'

export type EtatFormulaire = {
  errors?: Record<string, string[]>
  message?: string
  /** Vrai quand `message` annonce une réussite (et non une erreur). */
  succes?: boolean
}

const ABREVIATION_DEJA_UTILISEE = 'Cette abréviation est déjà utilisée par un autre établissement.'
const ETABLISSEMENT_DISPARU =
  "Cet établissement n'existe plus (il a peut-être été supprimé). Rechargez la liste des établissements."

export async function creerEtablissement(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const parsed = EtablissementSchema.safeParse({
    nom: formData.get('nom'),
    abreviation: formData.get('abreviation'),
    type: formData.get('type'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  let etablissementId: string
  try {
    const created = await prisma.etablissement.create({ data: parsed.data })
    etablissementId = created.id
  } catch (erreur) {
    // Seul un code de doublon annonce « abréviation déjà utilisée » : toute autre cause
    // (base arrêtée, contrainte…) reçoit son propre message.
    return {
      message: messageErreur(erreur, 'creerEtablissement', {
        unicite: ABREVIATION_DEJA_UTILISEE,
      }),
    }
  }

  // L'établissement existe désormais. Quoi qu'il arrive à l'image, on quitte le formulaire :
  // y rester ferait annoncer un faux doublon d'abréviation au second clic sur « Créer ».
  let photoEnregistree = true
  const photo = formData.get('photo') as File | null
  if (photo && photo.size) {
    try {
      const buffer = Buffer.from(await photo.arrayBuffer())
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'etablissements')
      await fs.mkdir(uploadsDir, { recursive: true })
      const ext = photo.type?.split('/')[1] || 'jpg'
      const filename = `${etablissementId}.${ext}`
      const filepath = path.join(uploadsDir, filename)
      await fs.writeFile(filepath, buffer)
      const url = `/uploads/etablissements/${filename}`
      await prisma.etablissement.update({ where: { id: etablissementId }, data: { photoUrl: url } })
    } catch (erreur) {
      console.error('creerEtablissement : image non enregistrée', erreur)
      photoEnregistree = false
    }
  }

  revalidatePath('/etablissements')
  // Image en échec : la fiche signale que l'image est à renvoyer (bandeau « photo=echec »).
  redirect(photoEnregistree ? '/etablissements' : `/etablissements/${etablissementId}?photo=echec`)
}

export async function modifierEtablissement(
  id: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const parsed = EtablissementSchema.safeParse({
    nom: formData.get('nom'),
    abreviation: formData.get('abreviation'),
    type: formData.get('type'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  let etablissementExistant: { photoUrl: string | null } | null
  try {
    etablissementExistant = await prisma.etablissement.findUnique({ where: { id } })

    await prisma.etablissement.update({ where: { id }, data: parsed.data })
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'modifierEtablissement', {
        unicite: ABREVIATION_DEJA_UTILISEE,
        introuvable: ETABLISSEMENT_DISPARU,
      }),
    }
  }

  // Les données sont enregistrées : un échec d'image ne doit plus être présenté comme un
  // doublon d'abréviation.
  let photoEnregistree = true
  try {
    const removePhoto = (formData.get('removePhoto') as string | null) === 'on'
    if (removePhoto && etablissementExistant?.photoUrl) {
      const existingPath = path.join(
        process.cwd(),
        'public',
        etablissementExistant.photoUrl.replace(/^\//, '')
      )
      await fs.unlink(existingPath).catch(() => {})
      await prisma.etablissement.update({ where: { id }, data: { photoUrl: null } })
    }

    const photo = formData.get('photo') as File | null
    if (photo && photo.size) {
      if (etablissementExistant?.photoUrl) {
        const existingPath = path.join(
          process.cwd(),
          'public',
          etablissementExistant.photoUrl.replace(/^\//, '')
        )
        await fs.unlink(existingPath).catch(() => {})
      }

      const buffer = Buffer.from(await photo.arrayBuffer())
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'etablissements')
      await fs.mkdir(uploadsDir, { recursive: true })
      const ext = photo.type?.split('/')[1] || 'jpg'
      const filename = `${id}.${ext}`
      const filepath = path.join(uploadsDir, filename)
      await fs.writeFile(filepath, buffer)
      const url = `/uploads/etablissements/${filename}`
      await prisma.etablissement.update({ where: { id }, data: { photoUrl: url } })
    }
  } catch (erreur) {
    console.error('modifierEtablissement : image non enregistrée', erreur)
    photoEnregistree = false
  }

  revalidatePath('/etablissements')
  redirect(photoEnregistree ? `/etablissements/${id}` : `/etablissements/${id}?photo=echec`)
}

export async function supprimerEtablissement(
  id: string,
  _prevState: EtatFormulaire,
  _formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  try {
    const departements = await prisma.departement.count({ where: { etablissementId: id } })
    if (departements > 0) {
      return {
        message: `Impossible de supprimer : ${departements} département(s) rattaché(s) à cet établissement.`,
      }
    }

    await prisma.etablissement.delete({ where: { id } })
  } catch (erreur) {
    // Établissement déjà supprimé (autre onglet, double clic) : le résultat voulu est atteint.
    if (analyserErreur(erreur).nature !== 'introuvable') {
      return {
        message: messageErreur(erreur, 'supprimerEtablissement', {
          reference:
            'Impossible de supprimer : des éléments (départements, enseignants) dépendent encore de cet établissement.',
        }),
      }
    }
  }
  revalidatePath('/etablissements')
  redirect('/etablissements')
}

export async function creerDepartement(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
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
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'creerDepartement', {
        unicite: {
          nom: 'Un département de ce nom existe déjà dans cet établissement.',
          abreviation:
            'Cette abréviation est déjà utilisée par un autre département de cet établissement.',
          '*': 'Ce nom ou cette abréviation existe déjà pour cet établissement.',
        },
        reference: ETABLISSEMENT_DISPARU,
      }),
    }
  }

  revalidatePath(`/etablissements/${parsed.data.etablissementId}`)
  return { message: 'Département ajouté.', succes: true }
}
