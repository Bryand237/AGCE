'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigerUtilisateur } from '@/lib/auth'
import { analyserErreur, messageErreur } from '@/lib/erreurs'
import { AbsenceSchema } from '@/lib/validations/absence'
import { calculerFinCongeMaternite } from '@/domain/absences/calculerFinCongeMaternite'
import { genererAttestationAbsence } from '@/lib/documents/genererAttestationAbsence'

export type EtatFormulaire = {
  errors?: Record<string, string[]>
  message?: string
  /** Vrai quand `message` annonce une réussite (et non une erreur). */
  succes?: boolean
}

const ABSENCE_DISPARUE =
  "Cette absence n'existe plus (elle a peut-être été supprimée). Rechargez la liste des absences."

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
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

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
  const dateRetour = new Date(formData.get('dateRetour') as string)
  if (isNaN(dateRetour.getTime())) return { message: 'Date de retour obligatoire.' }

  try {
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
  const dateDebut = new Date(formData.get('dateDebut') as string)
  const dateFin = new Date(formData.get('dateFin') as string)
  if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) return { message: 'Dates invalides.' }

  try {
    await prisma.absence.update({
      where: { id: absenceId },
      data: { dateDebut, dateFin, motif: (formData.get('motif') as string) || null },
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
    await prisma.absence.delete({ where: { id: absenceId } })
  } catch (erreur) {
    // Absence déjà supprimée (autre onglet, double clic) : le résultat voulu est atteint.
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
  revalidatePath('/absences')
  return { message: 'Attestation validée.', succes: true }
}
