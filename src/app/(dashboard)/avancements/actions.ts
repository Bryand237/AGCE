'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculerProchainEchelon } from '@/domain/avancement/calculerProchainEchelon'
import { proposerCandidats } from '@/domain/avancement/eligibilite'
import { genererDecisionAvancement } from '@/lib/documents/genererDecisionAvancement'

export type EtatFormulaire = { errors?: Record<string, string[]>; message?: string }

export async function creerRapport(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const numero = formData.get('numero') as string
  const periodeDebut = new Date(formData.get('periodeDebut') as string)
  const periodeFin = new Date(formData.get('periodeFin') as string)
  if (!numero || isNaN(periodeDebut.getTime()) || isNaN(periodeFin.getTime())) {
    return { message: "L'édition et la période sont obligatoires." }
  }

  const [candidatsBruts, grille] = await Promise.all([
    prisma.enseignant.findMany({
      where: { statut: 'ACTIF' },
      select: {
        id: true,
        grade: true,
        dateEffetEchelon: true,
        positionActuelle: { select: { ordre: true } },
      },
    }),
    prisma.echelonIndiciaire.findMany(),
  ])

  const propositions = proposerCandidats(
    candidatsBruts.map((e) => ({
      enseignantId: e.id,
      grade: e.grade,
      ordreActuel: e.positionActuelle.ordre,
      dateEffetEchelon: e.dateEffetEchelon,
    })),
    periodeFin,
    grille
  )

  const rapport = await prisma.sessionConseil.create({
    data: {
      numero,
      periodeDebut,
      periodeFin,
      selections: {
        create: propositions.map((p) => ({
          enseignantId: p.enseignantId,
          positionProposeeId: p.positionProposeeId,
        })),
      },
    },
  })

  revalidatePath('/avancements')
  redirect(`/avancements/${rapport.id}`)
}

export async function ajouterSelection(
  rapportId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const matricule = formData.get('matricule') as string
  const enseignant = await prisma.enseignant.findUnique({
    where: { matricule },
    include: { positionActuelle: true },
  })
  if (!enseignant) return { message: 'Aucun enseignant avec ce matricule.' }

  const grille = await prisma.echelonIndiciaire.findMany()
  const suivant = calculerProchainEchelon(
    grille,
    enseignant.grade,
    enseignant.positionActuelle.ordre
  )
  if (!suivant) {
    return {
      message: 'Cet enseignant est en fin de grille : changement de classe ou de grade requis.',
    }
  }

  await prisma.selectionAvancement.upsert({
    where: { rapportId_enseignantId: { rapportId, enseignantId: enseignant.id } },
    update: { positionProposeeId: suivant.id },
    create: { rapportId, enseignantId: enseignant.id, positionProposeeId: suivant.id },
  })
  revalidatePath(`/avancements/${rapportId}`)
  return {}
}

export async function retirerSelection(rapportId: string, enseignantId: string): Promise<void> {
  await prisma.selectionAvancement.delete({
    where: { rapportId_enseignantId: { rapportId, enseignantId } },
  })
  revalidatePath(`/avancements/${rapportId}`)
}

export async function rejeterRapport(rapportId: string, formData: FormData): Promise<void> {
  const motif = formData.get('motif') as string
  await prisma.sessionConseil.update({ where: { id: rapportId }, data: { motifRejet: motif } })
  revalidatePath(`/avancements/${rapportId}`)
}

export async function validerRapport(
  rapportId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const dateValidation = new Date(formData.get('dateValidation') as string)
  const auteurValidation = formData.get('auteurValidation') as string
  if (isNaN(dateValidation.getTime()) || !auteurValidation) {
    return { message: 'Date et auteur de la validation sont obligatoires.' }
  }

  const rapport = await prisma.sessionConseil.findUnique({
    where: { id: rapportId },
    include: { selections: { include: { enseignant: true } } },
  })
  if (!rapport) return { message: 'Rapport introuvable.' }
  if (rapport.statut === 'VALIDE') return { message: 'Ce rapport est déjà validé.' }
  if (rapport.selections.length === 0) return { message: 'Aucun enseignant sélectionné.' }

  await prisma.$transaction(async (tx) => {
    for (const s of rapport.selections) {
      await tx.historiqueAvancement.create({
        data: {
          enseignantId: s.enseignantId,
          sessionId: rapport.id,
          anciennePositionId: s.enseignant.positionActuelleId,
          dateAncienEffet: s.enseignant.dateEffetEchelon,
          nouvellePositionId: s.positionProposeeId,
          dateNouvelEffet: rapport.periodeFin,
        },
      })
      await tx.enseignant.update({
        where: { id: s.enseignantId },
        data: { positionActuelleId: s.positionProposeeId, dateEffetEchelon: rapport.periodeFin },
      })
    }
    await tx.sessionConseil.update({
      where: { id: rapportId },
      data: { statut: 'VALIDE', motifRejet: null, dateValidation, auteurValidation },
    })
  })

  revalidatePath('/avancements')
  redirect(`/avancements/${rapportId}`)
}

export async function genererDecision(
  avancementId: string,
  _prevState: EtatFormulaire
): Promise<EtatFormulaire> {
  const avancement = await prisma.historiqueAvancement.findUnique({
    where: { id: avancementId },
    include: { enseignant: true, anciennePosition: true, nouvellePosition: true, session: true },
  })
  if (!avancement?.session) return { message: 'Avancement ou session introuvable.' }

  const buffer = genererDecisionAvancement({
    enseignant: avancement.enseignant,
    anciennePosition: avancement.anciennePosition,
    nouvellePosition: avancement.nouvellePosition,
    dateAncienEffet: avancement.dateAncienEffet,
    dateNouvelEffet: avancement.dateNouvelEffet,
    numeroDecision: '', // brouillon : le numéro n'est pas encore attribué
    rapport: avancement.session,
  })

  await prisma.historiqueAvancement.update({
    where: { id: avancementId },
    data: { decisionGeneree: new Uint8Array(buffer), statutDecision: 'EN_ATTENTE' },
  })
  revalidatePath(`/avancements/${avancement.sessionId}/${avancementId}`)
  return { message: 'Brouillon généré.' }
}

export async function validerDecision(
  avancementId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const numeroDecision = formData.get('numeroDecision') as string
  const dateValidation = new Date(formData.get('dateValidation') as string)
  const auteurValidation = formData.get('auteurValidation') as string
  if (!numeroDecision || isNaN(dateValidation.getTime()) || !auteurValidation) {
    return { message: 'Numéro, date et auteur sont tous obligatoires.' }
  }

  // const avancement = await prisma.historiqueAvancement.findUnique({
  //   where: { id: avancementId },
  //   include: { enseignant: true, anciennePosition: true, nouvellePosition: true, session: true },
  // })
  // if (!avancement?.session) return { message: 'Avancement ou session introuvable.' }

  // Régénération avec le numéro désormais connu — remplace le brouillon.
  // const buffer = genererDecisionAvancement({
  //   enseignant: avancement.enseignant,
  //   anciennePosition: avancement.anciennePosition,
  //   nouvellePosition: avancement.nouvellePosition,
  //   dateAncienEffet: avancement.dateAncienEffet,
  //   dateNouvelEffet: avancement.dateNouvelEffet,
  //   numeroDecision,
  //   rapport: avancement.session,
  // })

  await prisma.historiqueAvancement.update({
    where: { id: avancementId },
    data: {
      // decisionGeneree: buffer,
      statutDecision: 'VALIDEE',
      numeroDecision,
      dateValidationDecision: dateValidation,
      auteurValidationDecision: auteurValidation,
    },
  })
  revalidatePath('/avancements')
  return { message: 'Décision validée.' }
}
