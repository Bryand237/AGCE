'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigerUtilisateur } from '@/lib/auth'
import { messageErreur } from '@/lib/erreurs'
import { EnseignantSchema, TransfertSchema, RetraiteSchema } from '@/lib/validations/enseignant'
import { erreurFinDeService } from '@/domain/enseignants/finDeService'
import { erreurChangementStatut, type ChangementStatut } from '@/domain/enseignants/statut'
import fs from 'fs/promises'
import path from 'path'

export type EtatFormulaire = {
  errors?: Record<string, string[]>
  message?: string
  /** Vrai quand `message` annonce une réussite (et non une erreur). */
  succes?: boolean
}

const ENSEIGNANT_DISPARU =
  "Cet enseignant n'existe plus (il a peut-être été supprimé). Rechargez la liste des enseignants."

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
  await exigerUtilisateur()
  const parsed = EnseignantSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { positionActuelleId, ...donnees } = parsed.data

  let enseignantId: string
  try {
    const position = await resoudrePosition(positionActuelleId)
    if (!position) {
      // Cas rare (grille modifiée entre le chargement du formulaire et
      // l'envoi) : un message clair plutôt qu'une exception.
      return { message: 'Position de grille invalide — rechargez la page et réessayez.' }
    }

    const created = await prisma.enseignant.create({
      data: {
        ...donnees,
        grade: position.grade,
        positionActuelleId: position.id,
      },
    })
    enseignantId = created.id
  } catch (erreur) {
    // Seul un code de doublon annonce « matricule existant » : toute autre cause
    // (base arrêtée, contrainte…) reçoit son propre message.
    return {
      message: messageErreur(erreur, 'creerEnseignant', {
        unicite: 'Ce matricule existe déjà.',
      }),
    }
  }

  // La fiche existe désormais. Quoi qu'il arrive à la photo, on quitte le formulaire :
  // y rester ferait annoncer un faux doublon de matricule au second clic sur « Enregistrer ».
  let photoEnregistree = true
  const photo = formData.get('photo') as File | null
  if (photo && photo.size) {
    try {
      const buffer = Buffer.from(await photo.arrayBuffer())
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'enseignants')
      await fs.mkdir(uploadsDir, { recursive: true })
      const ext = photo.type?.split('/')[1] || 'jpg'
      const filename = `${enseignantId}.${ext}`
      const filepath = path.join(uploadsDir, filename)
      await fs.writeFile(filepath, buffer)
      const url = `/uploads/enseignants/${filename}`
      await prisma.enseignant.update({ where: { id: enseignantId }, data: { photoUrl: url } })
    } catch (erreur) {
      console.error('creerEnseignant : photo non enregistrée', erreur)
      photoEnregistree = false
    }
  }

  revalidatePath('/enseignants')
  // Photo en échec : la fiche signale que la photo est à renvoyer (bandeau « photo=echec »).
  redirect(photoEnregistree ? '/enseignants' : `/enseignants/${enseignantId}?photo=echec`)
}

export async function modifierEnseignant(
  id: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const parsed = EnseignantSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { positionActuelleId, ...donnees } = parsed.data

  let enseignantExistant: { photoUrl: string | null } | null
  try {
    const position = await resoudrePosition(positionActuelleId)
    if (!position) {
      return { message: 'Position de grille invalide — rechargez la page et réessayez.' }
    }

    enseignantExistant = await prisma.enseignant.findUnique({ where: { id } })

    await prisma.enseignant.update({
      where: { id },
      data: {
        ...donnees,
        grade: position.grade,
        positionActuelleId: position.id,
      },
    })
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'modifierEnseignant', {
        unicite: 'Ce matricule existe déjà pour un autre enseignant.',
        introuvable: ENSEIGNANT_DISPARU,
      }),
    }
  }

  // Les données sont enregistrées : un échec de photo ne doit plus être présenté comme un
  // échec de la modification (ni, à l'inverse, passer pour un doublon de matricule).
  let photoEnregistree = true
  try {
    // Gérer suppression explicite de la photo si demandé
    const removePhoto = (formData.get('removePhoto') as string | null) === 'on'
    if (removePhoto && enseignantExistant?.photoUrl) {
      const existingPath = path.join(
        process.cwd(),
        'public',
        enseignantExistant.photoUrl.replace(/^\//, '')
      )
      await fs.unlink(existingPath).catch(() => {})
      await prisma.enseignant.update({ where: { id }, data: { photoUrl: null } })
    }

    // Si une nouvelle photo est fournie, l'enregistrer (remplacer l'ancienne si besoin)
    const photo = formData.get('photo') as File | null
    if (photo && photo.size) {
      // Supprimer l'ancienne photo si elle existe
      if (enseignantExistant?.photoUrl) {
        const existingPath = path.join(
          process.cwd(),
          'public',
          enseignantExistant.photoUrl.replace(/^\//, '')
        )
        await fs.unlink(existingPath).catch(() => {})
      }

      const buffer = Buffer.from(await photo.arrayBuffer())
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'enseignants')
      await fs.mkdir(uploadsDir, { recursive: true })
      const ext = photo.type?.split('/')[1] || 'jpg'
      const filename = `${id}.${ext}`
      const filepath = path.join(uploadsDir, filename)
      await fs.writeFile(filepath, buffer)
      const url = `/uploads/enseignants/${filename}`
      await prisma.enseignant.update({ where: { id }, data: { photoUrl: url } })
    }
  } catch (erreur) {
    console.error('modifierEnseignant : photo non enregistrée', erreur)
    photoEnregistree = false
  }

  revalidatePath('/enseignants')
  redirect(photoEnregistree ? `/enseignants/${id}` : `/enseignants/${id}?photo=echec`)
}

/**
 * Refus d'un changement de statut : la fiche est rechargée, car le formulaire que l'utilisateur
 * avait sous les yeux ne correspond plus à l'état réel de l'enseignant (modifié depuis dans un
 * autre onglet, par exemple).
 */
function changementRefuse(id: string, message: string): EtatFormulaire {
  revalidatePath('/enseignants')
  revalidatePath(`/enseignants/${id}`)
  return { message }
}

/**
 * Relit l'enseignant et juge le changement demandé d'après son statut ENREGISTRÉ, jamais d'après
 * ce que le formulaire affichait : `disparu` quand sa fiche n'existe plus, `refus` (le message à
 * afficher) quand la transition n'est pas permise.
 */
async function lireStatut(id: string, changement: ChangementStatut) {
  const enseignant = await prisma.enseignant.findUnique({
    where: { id },
    select: { statut: true, datePriseService: true },
  })
  if (!enseignant) return { disparu: true as const }
  const refus = erreurChangementStatut(enseignant.statut, changement)
  return { disparu: false as const, enseignant, refus }
}

export async function marquerTransfere(
  id: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const parsed = TransfertSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    const lecture = await lireStatut(id, 'transferer')
    if (lecture.disparu) return { message: ENSEIGNANT_DISPARU }
    if (lecture.refus) return changementRefuse(id, lecture.refus)
    const { enseignant } = lecture
    const incoherence = erreurFinDeService(enseignant.datePriseService, parsed.data.dateFinService)
    if (incoherence) return { errors: { dateFinService: [incoherence] } }

    await prisma.enseignant.update({
      where: { id },
      data: {
        statut: 'TRANSFERE',
        dateFinService: parsed.data.dateFinService,
        lieuTransfert: parsed.data.lieuTransfert,
      },
    })
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'marquerTransfere', { introuvable: ENSEIGNANT_DISPARU }),
    }
  }

  revalidatePath('/enseignants')
  revalidatePath(`/enseignants/${id}`)
  return { message: 'Enseignant marqué comme transféré.', succes: true }
}

export async function marquerRetraite(
  id: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const parsed = RetraiteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    const lecture = await lireStatut(id, 'retraiter')
    if (lecture.disparu) return { message: ENSEIGNANT_DISPARU }
    if (lecture.refus) return changementRefuse(id, lecture.refus)
    const { enseignant } = lecture
    const incoherence = erreurFinDeService(enseignant.datePriseService, parsed.data.dateFinService)
    if (incoherence) return { errors: { dateFinService: [incoherence] } }

    // Le lieu de transfert n'a de sens que pour un transféré : on l'efface ici, au cas où une
    // réactivation d'avant ce correctif l'aurait laissé dans la fiche.
    await prisma.enseignant.update({
      where: { id },
      data: {
        statut: 'RETRAITE',
        dateFinService: parsed.data.dateFinService,
        lieuTransfert: null,
      },
    })
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'marquerRetraite', { introuvable: ENSEIGNANT_DISPARU }),
    }
  }

  revalidatePath('/enseignants')
  revalidatePath(`/enseignants/${id}`)
  return { message: 'Enseignant marqué comme retraité.', succes: true }
}

export async function reactiverEnseignant(
  id: string,
  _prevState: EtatFormulaire,
  _formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  try {
    const lecture = await lireStatut(id, 'reactiver')
    if (lecture.disparu) return { message: ENSEIGNANT_DISPARU }
    if (lecture.refus) return changementRefuse(id, lecture.refus)

    // Un enseignant réactivé n'est plus transféré : sans cela, la fiche garderait une
    // destination qui ne correspond plus à rien (et la liste des transférés l'afficherait).
    await prisma.enseignant.update({
      where: { id },
      data: { statut: 'ACTIF', dateFinService: null, lieuTransfert: null },
    })
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'reactiverEnseignant', { introuvable: ENSEIGNANT_DISPARU }),
    }
  }
  revalidatePath('/enseignants')
  revalidatePath(`/enseignants/${id}`)
  return { message: 'Enseignant réactivé.', succes: true }
}
