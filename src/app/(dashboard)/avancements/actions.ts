'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculerProchainEchelon } from '@/domain/avancement/calculerProchainEchelon'
import { proposerCandidats } from '@/domain/avancement/eligibilite'
import { genererDecisionAvancement } from '@/lib/documents/genererDecisionAvancement'
import { MetadonneesSessionSchema, ValidationDecisionSchema } from '@/lib/validations/avancement'

export type EtatFormulaire = { errors?: Record<string, string[]>; message?: string }

async function chargerAvancementPourDecision(avancementId: string) {
  return prisma.historiqueAvancement.findUnique({
    where: { id: avancementId },
    include: { enseignant: true, anciennePosition: true, nouvellePosition: true, session: true },
  })
}

export async function mettreAJourMetadonneesSession(
  rapportId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const parsed = MetadonneesSessionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const rapport = await prisma.sessionConseil.findUnique({ where: { id: rapportId } })
  if (!rapport) return { message: 'Rapport introuvable.' }

  await prisma.sessionConseil.update({
    where: { id: rapportId },
    data: parsed.data,
  })
  revalidatePath(`/avancements/${rapportId}`)
  return { message: 'Métadonnées enregistrées.' }
}

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
  const enseignantId = formData.get('enseignantId') as string
  if (!enseignantId) {
    return { message: 'Veuillez sélectionner un enseignant.' }
  }

  const enseignant = await prisma.enseignant.findUnique({
    where: { id: enseignantId },
    include: { positionActuelle: true },
  })
  if (!enseignant) return { message: 'Enseignant introuvable.' }

  const rapport = await prisma.sessionConseil.findUnique({ where: { id: rapportId } })
  if (!rapport) return { message: 'Rapport introuvable.' }
  if (rapport.statut === 'VALIDE') {
    return { message: 'Impossible d’ajouter un enseignant à un rapport déjà validé.' }
  }

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

export async function mettreAJourRapport(
  rapportId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const numero = (formData.get('numero') as string)?.trim()
  const periodeDebut = new Date(formData.get('periodeDebut') as string)
  const periodeFin = new Date(formData.get('periodeFin') as string)

  if (!numero || isNaN(periodeDebut.getTime()) || isNaN(periodeFin.getTime())) {
    return { message: 'Le numéro et les dates de période sont obligatoires.' }
  }

  await prisma.sessionConseil.update({
    where: { id: rapportId },
    data: { numero, periodeDebut, periodeFin },
  })

  revalidatePath(`/avancements/${rapportId}`)
  return { message: 'Informations du rapport mises à jour.' }
}

export async function modifierSelection(
  rapportId: string,
  selectionId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const positionProposeeId = formData.get('positionProposeeId') as string
  if (!positionProposeeId) {
    return { message: 'Veuillez choisir une position proposée valide.' }
  }

  const [rapport, selection] = await Promise.all([
    prisma.sessionConseil.findUnique({ where: { id: rapportId } }),
    prisma.selectionAvancement.findUnique({ where: { id: selectionId } }),
  ])

  if (!rapport) return { message: 'Rapport introuvable.' }
  if (!selection || selection.rapportId !== rapportId) {
    return { message: 'Sélection introuvable.' }
  }

  const position = await prisma.echelonIndiciaire.findUnique({ where: { id: positionProposeeId } })
  if (!position) {
    return { message: 'Position proposée invalide.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.selectionAvancement.update({
      where: { id: selectionId },
      data: { positionProposeeId },
    })

    if (rapport.statut === 'VALIDE') {
      const historique = await tx.historiqueAvancement.findFirst({
        where: { sessionId: rapportId, enseignantId: selection.enseignantId },
      })
      if (historique) {
        await tx.historiqueAvancement.update({
          where: { id: historique.id },
          data: { nouvellePositionId: positionProposeeId },
        })
      }
      await tx.enseignant.update({
        where: { id: selection.enseignantId },
        data: { positionActuelleId: positionProposeeId, dateEffetEchelon: rapport.periodeFin },
      })
    }
  })

  revalidatePath(`/avancements/${rapportId}`)
  return { message: 'Position proposée mise à jour.' }
}

export async function retirerSelection(rapportId: string, enseignantId: string): Promise<void> {
  const [rapport, selection] = await Promise.all([
    prisma.sessionConseil.findUnique({ where: { id: rapportId } }),
    prisma.selectionAvancement.findUnique({
      where: { rapportId_enseignantId: { rapportId, enseignantId } },
    }),
  ])

  if (!rapport || !selection) {
    revalidatePath(`/avancements/${rapportId}`)
    return
  }

  await prisma.$transaction(async (tx) => {
    if (rapport.statut === 'VALIDE') {
      const historique = await tx.historiqueAvancement.findFirst({
        where: { sessionId: rapportId, enseignantId },
      })
      if (historique) {
        const enseignant = await tx.enseignant.findUnique({ where: { id: enseignantId } })
        if (enseignant?.positionActuelleId === historique.nouvellePositionId) {
          await tx.enseignant.update({
            where: { id: enseignantId },
            data: {
              positionActuelleId: historique.anciennePositionId,
              dateEffetEchelon: historique.dateAncienEffet,
            },
          })
        }
        await tx.historiqueAvancement.delete({ where: { id: historique.id } })
      }
    }

    await tx.selectionAvancement.delete({
      where: { rapportId_enseignantId: { rapportId, enseignantId } },
    })
  })

  revalidatePath(`/avancements/${rapportId}`)
}

export async function supprimerRapport(rapportId: string): Promise<void> {
  const rapport = await prisma.sessionConseil.findUnique({
    where: { id: rapportId },
    include: {
      avancements: { include: { enseignant: true } },
      selections: true,
    },
  })
  if (!rapport) return

  await prisma.$transaction(async (tx) => {
    for (const avancement of rapport.avancements) {
      if (avancement.enseignant.positionActuelleId === avancement.nouvellePositionId) {
        await tx.enseignant.update({
          where: { id: avancement.enseignantId },
          data: {
            positionActuelleId: avancement.anciennePositionId,
            dateEffetEchelon: avancement.dateAncienEffet,
          },
        })
      }
    }

    await tx.historiqueAvancement.deleteMany({ where: { sessionId: rapportId } })
    await tx.sessionConseil.delete({ where: { id: rapportId } })
  })

  revalidatePath('/avancements')
  redirect('/avancements')
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
  const avancement = await chargerAvancementPourDecision(avancementId)
  if (!avancement?.session) return { message: 'Avancement ou session introuvable.' }

  const buffer = genererDecisionAvancement({
    enseignant: avancement.enseignant,
    anciennePosition: avancement.anciennePosition,
    nouvellePosition: avancement.nouvellePosition,
    dateAncienEffet: avancement.dateAncienEffet,
    dateNouvelEffet: avancement.dateNouvelEffet,
    numeroDecision: '', // brouillon : numéro attribué lors de la signature
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
  const parsed = ValidationDecisionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { numeroDecision, dateValidation, auteurValidation } = parsed.data
  const avancement = await chargerAvancementPourDecision(avancementId)
  if (!avancement?.session) return { message: 'Avancement ou session introuvable.' }

  const buffer = genererDecisionAvancement({
    enseignant: avancement.enseignant,
    anciennePosition: avancement.anciennePosition,
    nouvellePosition: avancement.nouvellePosition,
    dateAncienEffet: avancement.dateAncienEffet,
    dateNouvelEffet: avancement.dateNouvelEffet,
    numeroDecision,
    rapport: avancement.session,
    dateSignature: dateValidation,
  })

  await prisma.historiqueAvancement.update({
    where: { id: avancementId },
    data: {
      decisionGeneree: new Uint8Array(buffer),
      statutDecision: 'VALIDEE',
      numeroDecision,
      dateValidationDecision: dateValidation,
      auteurValidationDecision: auteurValidation,
    },
  })
  revalidatePath(`/avancements/${avancement.sessionId}/${avancementId}`)
  revalidatePath('/avancements')
  return { message: 'Décision signée et régénérée.' }
}
