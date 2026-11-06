'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigerUtilisateur } from '@/lib/auth'
import { analyserErreur, messageErreur } from '@/lib/erreurs'
import { EtablissementSchema, DepartementSchema } from '@/lib/validations/etablissement'
import { enregistrerImage, lireImageTeleversee, supprimerImage } from '@/lib/televersement'
import { avecMessage } from '@/lib/messages-flash'
import type { EtatFormulaire } from '@/lib/formulaires'

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

  // L'image est contrôlée AVANT d'enregistrer l'établissement : un fichier refusé ne laisse pas
  // une fiche créée à moitié (le nouvel envoi se heurterait à une fausse abréviation en double).
  const image = await lireImageTeleversee(formData.get('photo'))
  if (image && 'erreur' in image) return { message: image.erreur }

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
  if (image) {
    try {
      const url = await enregistrerImage('etablissements', etablissementId, image)
      await prisma.etablissement.update({ where: { id: etablissementId }, data: { photoUrl: url } })
    } catch (erreur) {
      console.error('creerEtablissement : image non enregistrée', erreur)
      photoEnregistree = false
    }
  }

  revalidatePath('/etablissements')
  // Image en échec : la fiche s'ouvre avec l'avertissement « image à renvoyer ».
  redirect(
    photoEnregistree
      ? avecMessage('/etablissements', 'etablissement_cree')
      : avecMessage(`/etablissements/${etablissementId}`, 'image_etablissement_echec')
  )
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

  // Image contrôlée avant toute écriture : refusée, rien n'est modifié.
  const image = await lireImageTeleversee(formData.get('photo'))
  if (image && 'erreur' in image) return { message: image.erreur }

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
    const ancienneUrl = etablissementExistant?.photoUrl ?? null
    if (image) {
      // Nouvelle image : le fichier neuf d'abord, la base ensuite, l'ancien fichier en dernier.
      // Quelle que soit l'étape qui échoue, il reste toujours une image valide à l'écran.
      const url = await enregistrerImage('etablissements', id, image)
      await prisma.etablissement.update({ where: { id }, data: { photoUrl: url } })
      await supprimerImage(ancienneUrl)
    } else if (formData.get('removePhoto') === 'on' && ancienneUrl) {
      await prisma.etablissement.update({ where: { id }, data: { photoUrl: null } })
      await supprimerImage(ancienneUrl)
    }
  } catch (erreur) {
    console.error('modifierEtablissement : image non enregistrée', erreur)
    photoEnregistree = false
  }

  revalidatePath('/etablissements')
  redirect(
    avecMessage(
      `/etablissements/${id}`,
      photoEnregistree ? 'etablissement_modifie' : 'image_etablissement_echec'
    )
  )
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
  redirect(avecMessage('/etablissements', 'etablissement_supprime'))
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
