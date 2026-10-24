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
import { calculerFinCongeMaternite } from '@/domain/absences/calculerFinCongeMaternite'
import { erreurDateRetour } from '@/domain/absences/retourAbsence'
import { erreurEtapeAbsence, type EtapeAbsence } from '@/domain/absences/etapesAbsence'
import { genererAttestationAbsence } from '@/lib/documents/genererAttestationAbsence'

export type EtatFormulaire = {
  errors?: Record<string, string[]>
  message?: string
  /** Vrai quand `message` annonce une réussite (et non une erreur). */
  succes?: boolean
}

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
        motif: parsed.data.motif,
      },
    })
    absenceId = absence.id
  } catch (erreur) {
    return { message: messageErreur(erreur, 'creerAbsence') }
  }

  revalidatePath('/absences')
  redirect(`/absences/${absenceId}`)
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

    await prisma.absence.update({ where: { id: absenceId }, data: parsed.data })
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
  redirect('/absences')
}

export async function genererAttestation(
  absenceId: string,
  _prevState: EtatFormulaire
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  let absence
  try {
    absence = await prisma.absence.findUnique({
      where: { id: absenceId },
      include: { enseignant: { include: { departement: { include: { etablissement: true } } } } },
    })
  } catch (erreur) {
    return { message: messageErreur(erreur, 'genererAttestation') }
  }
  if (!absence) return { message: 'Absence introuvable.' }
  const refus = erreurEtapeAbsence('genererAttestation', absence)
  if (refus) return { message: refus }
  if (!absence.enseignant.departement) {
    return {
      message:
        'Cet enseignant n’a pas de département renseigné — impossible de générer l’attestation.',
    }
  }

  let buffer: Buffer
  try {
    buffer = genererAttestationAbsence(absence.type, {
      absence,
      enseignant: absence.enseignant,
      departement: absence.enseignant.departement,
      etablissement: absence.enseignant.departement.etablissement,
    })
  } catch (e) {
    return { message: (e as Error).message }
  }

  try {
    await prisma.absence.update({
      where: { id: absenceId },
      data: { decisionGeneree: new Uint8Array(buffer), statutAttestation: 'EN_ATTENTE' },
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
  const numeroDecision = formData.get('numeroDecision') as string
  const dateValidation = new Date(formData.get('dateValidation') as string)
  const auteurValidation = formData.get('auteurValidation') as string
  if (!numeroDecision || isNaN(dateValidation.getTime()) || !auteurValidation) {
    return { message: 'Numéro, date et auteur sont tous obligatoires.' }
  }

  try {
    const lecture = await lireEtape(absenceId, 'validerAttestation')
    if (lecture.disparue) return { message: ABSENCE_DISPARUE }
    if (lecture.refus) return { message: lecture.refus }

    await prisma.absence.update({
      where: { id: absenceId },
      data: {
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
