'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigerUtilisateur } from '@/lib/auth'
import { analyserErreur, messageErreur } from '@/lib/erreurs'
import {
  AbsenceSchema,
  ModificationAbsenceSchema,
  RetourAbsenceSchema,
} from '@/lib/validations/absence'
import { erreursDeSaisie } from '@/lib/validations/champs'
import { avecMessage } from '@/lib/messages-flash'
import { calculerFinCongeMaternite } from '@/domain/absences/calculerFinCongeMaternite'
import { erreurDateRetour } from '@/domain/absences/retourAbsence'
import { erreurEtapeAbsence, type EtapeAbsence } from '@/domain/absences/etapesAbsence'
import { erreurDetailsMission, motifAEnregistrer } from '@/domain/absences/motifMission'
import { genererAttestationAbsence } from '@/lib/documents/genererAttestationAbsence'
import type { EtatFormulaire } from '@/lib/formulaires'

const ABSENCE_DISPARUE =
  "Cette absence n'existe plus (elle a peut-être été supprimée). Rechargez la liste des absences."

/**
 * Relit l'absence et juge l'étape demandée d'après son état ENREGISTRÉ, jamais d'après ce que
 * la page affichait : `disparue` quand elle n'existe plus, `refus` (le message à afficher)
 * quand l'étape n'est pas permise (voir `etapesAbsence.ts`).
 */
async function lireEtape(absenceId: string, etape: EtapeAbsence) {
  const absence = await prisma.absence.findUnique({
    where: { id: absenceId },
    select: { statut: true, type: true, statutAttestation: true, dateDebut: true },
  })
  if (!absence) return { disparue: true as const }
  return { disparue: false as const, absence, refus: erreurEtapeAbsence(etape, absence) }
}

/** L'absence avec ce qu'il faut pour remplir son attestation. */
function lireAbsenceComplete(absenceId: string) {
  return prisma.absence.findUnique({
    where: { id: absenceId },
    include: { enseignant: { include: { departement: { include: { etablissement: true } } } } },
  })
}
type AbsenceComplete = NonNullable<Awaited<ReturnType<typeof lireAbsenceComplete>>>

/**
 * Remplit l'attestation de l'absence, ou dit pourquoi c'est impossible. Sans `signature`, c'est
 * un brouillon : le numéro et la date gardent leurs blancs. À la signature, le document est
 * REFAIT avec le numéro et la date saisis : ils sont imprimés dessus.
 */
function produireAttestation(
  absence: AbsenceComplete,
  signature?: { numeroDecision: string; dateSignature: Date }
): { buffer: Buffer } | { message: string } {
  // La décision de mission imprime l'établissement d'accueil et l'objet : sans eux, un blanc
  // resterait dans un acte signé.
  if (absence.type === 'MISSION') {
    const manque = erreurDetailsMission(absence.motif)
    if (manque) return { message: manque }
  }
  const departement = absence.enseignant.departement
  if (!departement) {
    return {
      message:
        'Cet enseignant n’a pas de département renseigné — impossible de générer l’attestation.',
    }
  }
  try {
    return {
      buffer: genererAttestationAbsence(absence.type, {
        absence,
        enseignant: absence.enseignant,
        departement,
        etablissement: departement.etablissement,
        ...signature,
      }),
    }
  } catch (e) {
    return { message: (e as Error).message }
  }
}

export async function creerAbsence(
  _prevStat: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const parsed = AbsenceSchema.safeParse({
    matricule: formData.get('matricule'),
    type: formData.get('type'),
    dateDebut: formData.get('dateDebut'),
    dateFin: formData.get('dateFin') || undefined,
    motif: formData.get('motif') || undefined,
    // Le formulaire d'une mission envoie ces deux champs au lieu du motif (voir motifMission.ts).
    lieuAccueil: formData.get('lieuAccueil') ?? undefined,
    objetMission: formData.get('objetMission') ?? undefined,
  })
  // Le formulaire n'affiche qu'une ligne d'erreur : le premier message y est joint.
  if (!parsed.success) return erreursDeSaisie(parsed.error)

  let absenceId: string
  try {
    const enseignant = await prisma.enseignant.findUnique({
      where: { matricule: parsed.data.matricule },
    })
    if (!enseignant) return { message: 'Aucun enseignant avec ce matricule.' }
    if (enseignant.statut !== 'ACTIF') {
      return {
        message: `Cet enseignant est ${enseignant.statut.toLowerCase()} : aucune absence ne peut lui être créée.`,
      }
    }

    const dejaEnCours = await prisma.absence.findFirst({
      where: { enseignantId: enseignant.id, statut: { not: 'TERMINE' } },
    })
    if (dejaEnCours) {
      return { message: 'Cet enseignant a déjà une absence en cours ou en attente.' }
    }

    const dateFin =
      parsed.data.type === 'CONGE_MATERNITE' && !parsed.data.dateFin
        ? calculerFinCongeMaternite(parsed.data.dateDebut)
        : parsed.data.dateFin
    if (!dateFin) return { message: 'Date de fin obligatoire pour ce type d’absence.' }

    const absence = await prisma.absence.create({
      data: {
        enseignantId: enseignant.id,
        type: parsed.data.type,
        dateDebut: parsed.data.dateDebut,
        dateFin,
        motif: motifAEnregistrer(parsed.data),
      },
    })
    absenceId = absence.id
  } catch (erreur) {
    return { message: messageErreur(erreur, 'creerAbsence') }
  }

  revalidatePath('/absences')
  redirect(avecMessage(`/absences/${absenceId}`, 'absence_creee'))
}

export async function validerAbsence(
  absenceId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const dateValidation = new Date(formData.get('dateValidation') as string)
  const auteurValidation = formData.get('auteurValidation') as string
  if (isNaN(dateValidation.getTime()) || !auteurValidation) {
    return { message: 'Date et auteur de la validation sont obligatoires.' }
  }

  try {
    const lecture = await lireEtape(absenceId, 'valider')
    if (lecture.disparue) return { message: ABSENCE_DISPARUE }
    if (lecture.refus) return { message: lecture.refus }

    await prisma.absence.update({
      where: { id: absenceId },
      data: {
        statut: 'EN_PERIODE',
        dateValidation,
        auteurValidation,
        referenceCorrespondance: (formData.get('referenceCorrespondance') as string) || null,
        dateCorrespondance: formData.get('dateCorrespondance')
          ? new Date(formData.get('dateCorrespondance') as string)
          : null,
        dateDemandeInteressee: formData.get('dateDemandeInteressee')
          ? new Date(formData.get('dateDemandeInteressee') as string)
          : null,
      },
    })
  } catch (erreur) {
    return { message: messageErreur(erreur, 'validerAbsence', { introuvable: ABSENCE_DISPARUE }) }
  }
  revalidatePath(`/absences/${absenceId}`)
  revalidatePath('/absences')
  return {}
}

export async function terminerAbsence(
  absenceId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const parsed = RetourAbsenceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)
  const { dateRetour } = parsed.data

  try {
    const lecture = await lireEtape(absenceId, 'terminer')
    if (lecture.disparue) return { message: ABSENCE_DISPARUE }
    if (lecture.refus) return { message: lecture.refus }
    const incoherence = erreurDateRetour(lecture.absence.dateDebut, dateRetour)
    if (incoherence) return { message: incoherence }

    await prisma.absence.update({
      where: { id: absenceId },
      data: { statut: 'TERMINE', dateRetour },
    })
  } catch (erreur) {
    return { message: messageErreur(erreur, 'terminerAbsence', { introuvable: ABSENCE_DISPARUE }) }
  }
  revalidatePath(`/absences/${absenceId}`)
  revalidatePath('/absences')
  return {}
}

export async function modifierAbsence(
  absenceId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const parsed = ModificationAbsenceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)

  try {
    const lecture = await lireEtape(absenceId, 'modifier')
    if (lecture.disparue) return { message: ABSENCE_DISPARUE }
    if (lecture.refus) return { message: lecture.refus }

    const { lieuAccueil, objetMission, ...donnees } = parsed.data
    await prisma.absence.update({
      where: { id: absenceId },
      data: {
        ...donnees,
        motif: motifAEnregistrer({ motif: donnees.motif, lieuAccueil, objetMission }),
      },
    })
  } catch (erreur) {
    return { message: messageErreur(erreur, 'modifierAbsence', { introuvable: ABSENCE_DISPARUE }) }
  }
  revalidatePath(`/absences/${absenceId}`)
  return {}
}

export async function supprimerAbsence(
  absenceId: string,
  _prevState: EtatFormulaire,
  _formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  try {
    const lecture = await lireEtape(absenceId, 'supprimer')
    // Absence déjà supprimée (autre onglet, double clic) : le résultat voulu est atteint.
    if (!lecture.disparue) {
      if (lecture.refus) return { message: lecture.refus }
      await prisma.absence.delete({ where: { id: absenceId } })
    }
  } catch (erreur) {
    // Supprimée entre la lecture et l'écriture : même résultat.
    if (analyserErreur(erreur).nature !== 'introuvable') {
      return { message: messageErreur(erreur, 'supprimerAbsence') }
    }
  }
  revalidatePath('/absences')
  redirect(avecMessage('/absences', 'absence_supprimee'))
}

export async function genererAttestation(
  absenceId: string,
  _prevState: EtatFormulaire
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  let absence
  try {
    absence = await lireAbsenceComplete(absenceId)
  } catch (erreur) {
    return { message: messageErreur(erreur, 'genererAttestation') }
  }
  if (!absence) return { message: 'Absence introuvable.' }
  const refus = erreurEtapeAbsence('genererAttestation', absence)
  if (refus) return { message: refus }

  const attestation = produireAttestation(absence)
  if ('message' in attestation) return { message: attestation.message }

  try {
    await prisma.absence.update({
      where: { id: absenceId },
      data: {
        decisionGeneree: new Uint8Array(attestation.buffer),
        statutAttestation: 'EN_ATTENTE',
      },
    })
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'genererAttestation', { introuvable: ABSENCE_DISPARUE }),
    }
  }
  revalidatePath(`/absences/${absenceId}`)
  return { message: 'Brouillon généré.', succes: true }
}

export async function validerAttestation(
  absenceId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  // Le numéro est imprimé sur l'attestation : il est enregistré tel qu'il y figurera.
  const numeroDecision = String(formData.get('numeroDecision') ?? '').trim()
  const dateValidation = new Date(formData.get('dateValidation') as string)
  const auteurValidation = formData.get('auteurValidation') as string
  if (!numeroDecision || isNaN(dateValidation.getTime()) || !auteurValidation) {
    return { message: 'Numéro, date et auteur sont tous obligatoires.' }
  }

  try {
    const absence = await lireAbsenceComplete(absenceId)
    if (!absence) return { message: ABSENCE_DISPARUE }
    const refus = erreurEtapeAbsence('validerAttestation', absence)
    if (refus) return { message: refus }

    // Le document signé porte le numéro et la date saisis : il est refait, pas seulement marqué.
    const attestation = produireAttestation(absence, {
      numeroDecision,
      dateSignature: dateValidation,
    })
    if ('message' in attestation) return { message: attestation.message }

    await prisma.absence.update({
      where: { id: absenceId },
      data: {
        decisionGeneree: new Uint8Array(attestation.buffer),
        statutAttestation: 'VALIDEE',
        numeroDecision,
        dateValidationAttestation: dateValidation,
        auteurValidationAttestation: auteurValidation,
      },
    })
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'validerAttestation', { introuvable: ABSENCE_DISPARUE }),
    }
  }
  revalidatePath(`/absences/${absenceId}`)
  revalidatePath('/absences')
  return { message: 'Attestation validée.', succes: true }
}
