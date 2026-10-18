'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigerUtilisateur } from '@/lib/auth'
import { calculerProchainEchelon } from '@/domain/avancement/calculerProchainEchelon'
import { proposerCandidats } from '@/domain/avancement/eligibilite'
import { erreurPositionProposee } from '@/domain/avancement/positionProposee'
import { erreurModificationRapportValide } from '@/domain/avancement/rapportValideModifiable'
import { separerSelections } from '@/domain/avancement/selectionsAValider'
import { genererDecisionAvancement } from '@/lib/documents/genererDecisionAvancement'
import {
  MetadonneesSessionSchema,
  RapportSchema,
  ValidationDecisionSchema,
} from '@/lib/validations/avancement'
import { erreursDeSaisie } from '@/lib/validations/champs'

export type EtatFormulaire = {
  errors?: Record<string, string[]>
  message?: string
  /** Vrai quand `message` annonce une réussite (et non une erreur). */
  succes?: boolean
  /** Sélections qui ne peuvent plus avancer, à montrer à l'utilisateur avant de valider. */
  exclusions?: { enseignantId: string; nom: string; matricule: string; motif: string }[]
  /** Vrai quand l'utilisateur peut valider quand même, sans les enseignants de `exclusions`. */
  peutConfirmer?: boolean
}

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
  await exigerUtilisateur()
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
  await exigerUtilisateur()
  const parsed = RapportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)
  const { numero, periodeDebut, periodeFin } = parsed.data

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
  await exigerUtilisateur()
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
  await exigerUtilisateur()
  const parsed = RapportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)

  await prisma.sessionConseil.update({
    where: { id: rapportId },
    data: parsed.data,
  })

  revalidatePath(`/avancements/${rapportId}`)
  return { message: 'Informations du rapport mises à jour.', succes: true }
}

export async function modifierSelection(
  rapportId: string,
  selectionId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
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

  const enseignant = await prisma.enseignant.findUnique({
    where: { id: selection.enseignantId },
    include: { positionActuelle: true },
  })
  if (!enseignant) return { message: 'Enseignant introuvable.' }

  // Position à partir de laquelle l'avancement se juge : celle de la fiche pour un brouillon ;
  // pour un rapport validé, celle d'AVANT l'avancement (la fiche porte déjà la position
  // issue du rapport).
  let depart = enseignant.positionActuelle
  let historique: { id: string } | null = null
  if (rapport.statut === 'VALIDE') {
    const trouve = await prisma.historiqueAvancement.findFirst({
      where: { sessionId: rapportId, enseignantId: selection.enseignantId },
      include: { anciennePosition: true },
    })
    if (!trouve) {
      return {
        message:
          "L'historique de cet avancement est introuvable : la position ne peut pas être modifiée.",
      }
    }
    const refus = erreurModificationRapportValide({
      statutDecision: trouve.statutDecision,
      positionActuelleId: enseignant.positionActuelleId,
      nouvellePositionId: trouve.nouvellePositionId,
    })
    if (refus) return { message: refus }
    depart = trouve.anciennePosition
    historique = trouve
  }

  const incoherence = erreurPositionProposee(depart, position)
  if (incoherence) return { message: incoherence }

  await prisma.$transaction(async (tx) => {
    await tx.selectionAvancement.update({
      where: { id: selectionId },
      data: { positionProposeeId },
    })

    if (historique) {
      await tx.historiqueAvancement.update({
        where: { id: historique.id },
        data: { nouvellePositionId: positionProposeeId },
      })
      // Position et grade s'écrivent ensemble (voir le commentaire du modèle Enseignant).
      await tx.enseignant.update({
        where: { id: selection.enseignantId },
        data: {
          positionActuelleId: positionProposeeId,
          grade: position.grade,
          dateEffetEchelon: rapport.periodeFin,
        },
      })
    }
  })

  revalidatePath(`/avancements/${rapportId}`)
  return { message: 'Position proposée mise à jour.' }
}

export async function retirerSelection(rapportId: string, enseignantId: string): Promise<void> {
  await exigerUtilisateur()
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
        include: { anciennePosition: true },
      })
      if (historique) {
        const enseignant = await tx.enseignant.findUnique({ where: { id: enseignantId } })
        if (enseignant?.positionActuelleId === historique.nouvellePositionId) {
          await tx.enseignant.update({
            where: { id: enseignantId },
            data: {
              positionActuelleId: historique.anciennePositionId,
              grade: historique.anciennePosition.grade,
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

export async function supprimerRapport(
  rapportId: string,
  _prevState: EtatFormulaire,
  _formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const rapport = await prisma.sessionConseil.findUnique({
    where: { id: rapportId },
    include: { avancements: { include: { enseignant: true, anciennePosition: true } } },
  })
  // Déjà supprimé (autre onglet, double clic) : le résultat voulu est atteint.
  if (!rapport) redirect('/avancements')

  // Un rapport validé a modifié les échelons et porte l'historique des décisions
  // signées. L'écran ne propose pas sa suppression : le serveur doit refuser lui
  // aussi, sinon l'historique officiel disparaîtrait.
  if (rapport.statut === 'VALIDE') {
    return { message: 'Un rapport validé ne peut pas être supprimé.' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const avancement of rapport.avancements) {
        if (avancement.enseignant.positionActuelleId === avancement.nouvellePositionId) {
          await tx.enseignant.update({
            where: { id: avancement.enseignantId },
            data: {
              positionActuelleId: avancement.anciennePositionId,
              grade: avancement.anciennePosition.grade,
              dateEffetEchelon: avancement.dateAncienEffet,
            },
          })
        }
      }

      // Les sélections référencent le rapport avec onDelete: Restrict : tant
      // qu'il en reste une, la suppression du rapport est refusée par la base.
      await tx.selectionAvancement.deleteMany({ where: { rapportId } })
      await tx.historiqueAvancement.deleteMany({ where: { sessionId: rapportId } })
      await tx.sessionConseil.delete({ where: { id: rapportId } })
    })
  } catch (erreur) {
    // La transaction est annulée en bloc : rien n'a été supprimé.
    console.error('supprimerRapport : échec de la suppression', erreur)
    return {
      message:
        "La suppression a échoué. Le rapport n'a pas été modifié ; réessayez, ou contactez le responsable technique si le problème persiste.",
    }
  }

  revalidatePath('/avancements')
  redirect('/avancements')
}

export async function rejeterRapport(rapportId: string, formData: FormData): Promise<void> {
  await exigerUtilisateur()
  const motif = formData.get('motif') as string
  await prisma.sessionConseil.update({ where: { id: rapportId }, data: { motifRejet: motif } })
  revalidatePath(`/avancements/${rapportId}`)
}

export async function validerRapport(
  rapportId: string,
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const dateValidation = new Date(formData.get('dateValidation') as string)
  const auteurValidation = formData.get('auteurValidation') as string
  if (isNaN(dateValidation.getTime()) || !auteurValidation) {
    return { message: 'Date et auteur de la validation sont obligatoires.' }
  }

  // Enseignants que l'utilisateur a déjà vus dans la liste d'exclusion et accepté de laisser de côté.
  const exclusionsConfirmees = new Set(
    ((formData.get('exclusionsConfirmees') as string | null) ?? '').split(',').filter(Boolean)
  )

  // Les enseignants sont relus dans la transaction qui valide : les sélections datent de la
  // création du rapport et peuvent être périmées (voir selectionsAValider.ts).
  const refus = await prisma.$transaction(async (tx): Promise<EtatFormulaire | null> => {
    const rapport = await tx.sessionConseil.findUnique({
      where: { id: rapportId },
      include: {
        selections: {
          include: { enseignant: { include: { positionActuelle: true } }, positionProposee: true },
        },
      },
    })
    if (!rapport) return { message: 'Rapport introuvable.' }
    if (rapport.statut === 'VALIDE') return { message: 'Ce rapport est déjà validé.' }
    if (rapport.selections.length === 0) return { message: 'Aucun enseignant sélectionné.' }

    const { valides, perimees } = separerSelections(
      rapport.selections.map((s) => ({
        ligne: s,
        statutEnseignant: s.enseignant.statut,
        positionActuelle: s.enseignant.positionActuelle,
        positionProposee: s.positionProposee,
      }))
    )
    const exclusions = perimees.map(({ ligne: s, motif }) => ({
      enseignantId: s.enseignantId,
      nom: `${s.enseignant.nom} ${s.enseignant.prenom}`,
      matricule: s.enseignant.matricule,
      motif,
    }))

    if (valides.length === 0) {
      return {
        message:
          'Aucun enseignant de ce rapport ne peut plus avancer. Rien n’a été validé : retirez-les du rapport, ou rejetez-le.',
        exclusions,
        peutConfirmer: false,
      }
    }
    // Aucune exclusion en silence : elles doivent avoir été montrées, puis confirmées.
    if (exclusions.some((e) => !exclusionsConfirmees.has(e.enseignantId))) {
      return {
        message: `${exclusions.length} enseignant(s) ne peuvent plus avancer. Rien n’a encore été validé.`,
        exclusions,
        peutConfirmer: true,
      }
    }

    for (const { ligne: s } of valides) {
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
        data: {
          positionActuelleId: s.positionProposeeId,
          grade: s.positionProposee.grade,
          dateEffetEchelon: rapport.periodeFin,
        },
      })
    }
    // Le rapport validé ne doit lister que les enseignants qui ont réellement avancé.
    for (const { ligne: s } of perimees) {
      await tx.selectionAvancement.delete({ where: { id: s.id } })
    }
    await tx.sessionConseil.update({
      where: { id: rapportId },
      data: { statut: 'VALIDE', motifRejet: null, dateValidation, auteurValidation },
    })
    return null
  })
  if (refus) return refus

  revalidatePath('/avancements')
  redirect(`/avancements/${rapportId}`)
}

export async function genererDecision(
  avancementId: string,
  _prevState: EtatFormulaire
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
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
  await exigerUtilisateur()
  const parsed = ValidationDecisionSchema.safeParse(Object.fromEntries(formData))
  // Le formulaire n'affiche qu'une ligne d'erreur : le premier message y est joint.
  if (!parsed.success) return erreursDeSaisie(parsed.error)

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
