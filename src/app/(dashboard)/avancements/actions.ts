'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigerUtilisateur } from '@/lib/auth'
import { avecMessage } from '@/lib/messages-flash'
import { calculerProchainEchelon } from '@/domain/avancement/calculerProchainEchelon'
import { proposerCandidats } from '@/domain/avancement/eligibilite'
import { avertissementChevauchement } from '@/domain/avancement/chevauchement'
import { erreurChangementFinDePeriode, memeJour } from '@/domain/avancement/periodeRapport'
import { erreurPositionProposee } from '@/domain/avancement/positionProposee'
import { erreurModificationRapportValide } from '@/domain/avancement/rapportValideModifiable'
import { separerSelections } from '@/domain/avancement/selectionsAValider'
import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { messageErreur } from '@/lib/erreurs'
import { OPTIONS_TRANSACTION } from '@/lib/transactions'
import { genererDecisionAvancement } from '@/lib/documents/genererDecisionAvancement'
import {
  MetadonneesSessionSchema,
  RapportSchema,
  ValidationDecisionSchema,
} from '@/lib/validations/avancement'
import {
  PositionProposeeSchema,
  RejetRapportSchema,
  SelectionEnseignantSchema,
  ValidationRapportSchema,
} from '@/lib/validations/rapport-avancement'
import { erreursDeSaisie } from '@/lib/validations/champs'
import type { EtatFormulaire } from '@/lib/formulaires'

/** L'état commun des formulaires, plus ce dont les rapports d'avancement ont besoin en plus. */
export type EtatFormulaireAvancement = EtatFormulaire & {
  /** Sélections qui ne peuvent plus avancer, à montrer à l'utilisateur avant de valider. */
  exclusions?: { enseignantId: string; nom: string; matricule: string; motif: string }[]
  /** Vrai quand l'utilisateur peut valider quand même, sans les enseignants de `exclusions`. */
  peutConfirmer?: boolean
  /** Vrai quand `message` est un avertissement que l'utilisateur peut passer en confirmant. */
  confirmationRequise?: boolean
}

const RAPPORT_INTROUVABLE = 'Rapport introuvable.'
const INFORMATIONS_MISES_A_JOUR = 'Informations du rapport mises à jour.'
// Transaction annulée parce qu'elle a duré trop longtemps (P2028) : tout est annulé en bloc.
const VALIDATION_TROP_LONGUE =
  'La validation a pris trop de temps : rien n’a été modifié. Réessayez ; si cela se reproduit, contactez le responsable technique.'
const MODIFICATION_TROP_LONGUE =
  'La modification a pris trop de temps : rien n’a été modifié. Réessayez.'

async function chargerAvancementPourDecision(avancementId: string) {
  return prisma.historiqueAvancement.findUnique({
    where: { id: avancementId },
    include: { enseignant: true, anciennePosition: true, nouvellePosition: true, session: true },
  })
}

export async function mettreAJourMetadonneesSession(
  rapportId: string,
  _prevState: EtatFormulaireAvancement,
  formData: FormData
): Promise<EtatFormulaireAvancement> {
  await exigerUtilisateur()
  const parsed = MetadonneesSessionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)

  // Valable pour un rapport de tout statut, validé compris : ces informations ne sont pas
  // recopiées à la validation, mais lues à chaque génération de décision. Elles peuvent
  // manquer à la création du rapport (A3 : texte ou session pas encore disponibles).
  try {
    await prisma.sessionConseil.update({ where: { id: rapportId }, data: parsed.data })
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'mettreAJourMetadonneesSession', {
        introuvable: RAPPORT_INTROUVABLE,
      }),
    }
  }
  revalidatePath(`/avancements/${rapportId}`)
  return { message: 'Métadonnées enregistrées.', succes: true }
}

/** Rapports en brouillon dont la période recoupe celle donnée (hors `sauf`, le rapport modifié). */
async function brouillonsChevauchants(periodeDebut: Date, periodeFin: Date, sauf?: string) {
  return prisma.sessionConseil.findMany({
    where: {
      statut: 'BROUILLON',
      periodeDebut: { lte: periodeFin },
      periodeFin: { gte: periodeDebut },
      ...(sauf ? { id: { not: sauf } } : {}),
    },
    select: { numero: true, periodeDebut: true, periodeFin: true },
    orderBy: { periodeDebut: 'asc' },
  })
}

export async function creerRapport(
  _prevState: EtatFormulaireAvancement,
  formData: FormData
): Promise<EtatFormulaireAvancement> {
  await exigerUtilisateur()
  const parsed = RapportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)
  const { numero, periodeDebut, periodeFin } = parsed.data

  // Deux brouillons sur la même période proposent les mêmes enseignants : valider les deux
  // ferait avancer deux fois les mêmes personnes. La seconde validation les signalerait (A4),
  // mais mieux vaut prévenir dès la création. Un avertissement, pas un blocage : l'utilisateur
  // peut confirmer (bouton « Créer quand même »).
  if (formData.get('confirmerChevauchement') !== 'oui') {
    const autres = await brouillonsChevauchants(periodeDebut, periodeFin)
    if (autres.length > 0) {
      return {
        message: avertissementChevauchement(autres, 'creation'),
        confirmationRequise: true,
      }
    }
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
  redirect(avecMessage(`/avancements/${rapport.id}`, 'rapport_cree'))
}

export async function ajouterSelection(
  rapportId: string,
  _prevState: EtatFormulaireAvancement,
  formData: FormData
): Promise<EtatFormulaireAvancement> {
  await exigerUtilisateur()
  const saisie = SelectionEnseignantSchema.safeParse(Object.fromEntries(formData))
  if (!saisie.success) return erreursDeSaisie(saisie.error)
  const { enseignantId } = saisie.data

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

/**
 * Brouillon : numéro et période se modifient librement (la sélection existante n'est pas
 * recalculée). Rapport validé : le numéro se modifie ; la fin de période n'est modifiable que
 * si sa nouvelle date peut être reportée partout où la validation l'a recopiée (A3).
 */
export async function mettreAJourRapport(
  rapportId: string,
  _prevState: EtatFormulaireAvancement,
  formData: FormData
): Promise<EtatFormulaireAvancement> {
  await exigerUtilisateur()
  const parsed = RapportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)
  const { numero, periodeDebut, periodeFin } = parsed.data

  const rapport = await prisma.sessionConseil.findUnique({
    where: { id: rapportId },
    select: { statut: true, periodeDebut: true, periodeFin: true },
  })
  if (!rapport) return { message: RAPPORT_INTROUVABLE }

  if (rapport.statut === 'VALIDE') {
    return modifierRapportValide(rapportId, { numero, periodeDebut, periodeFin })
  }

  // Changer la période d'un brouillon peut le faire chevaucher un autre brouillon : même
  // avertissement qu'à la création, seulement si la période change (renommer ne suffit pas).
  const periodeChangee =
    !memeJour(rapport.periodeDebut, periodeDebut) || !memeJour(rapport.periodeFin, periodeFin)
  if (periodeChangee && formData.get('confirmerChevauchement') !== 'oui') {
    const autres = await brouillonsChevauchants(periodeDebut, periodeFin, rapportId)
    if (autres.length > 0) {
      return {
        message: avertissementChevauchement(autres, 'modification'),
        confirmationRequise: true,
      }
    }
  }

  try {
    // Le statut est vérifié dans l'écriture : un rapport validé entre-temps (autre onglet)
    // ne doit pas voir sa période changer sans la propagation de modifierRapportValide.
    const { count } = await prisma.sessionConseil.updateMany({
      where: { id: rapportId, statut: { not: 'VALIDE' } },
      data: { numero, periodeDebut, periodeFin },
    })
    if (count === 0) {
      return {
        message:
          'Ce rapport vient d’être validé : rien n’a été modifié. Rechargez la page pour voir son état actuel.',
      }
    }
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'mettreAJourRapport', { introuvable: RAPPORT_INTROUVABLE }),
    }
  }

  revalidatePath('/avancements')
  revalidatePath(`/avancements/${rapportId}`)
  return { message: INFORMATIONS_MISES_A_JOUR, succes: true }
}

async function modifierRapportValide(
  rapportId: string,
  saisie: { numero: string; periodeDebut: Date; periodeFin: Date }
): Promise<EtatFormulaireAvancement> {
  let etat: EtatFormulaireAvancement
  try {
    // Tout se lit et s'écrit dans la même transaction : la vérification (décisions, positions)
    // porte sur l'état exact que la propagation va modifier.
    etat = await prisma.$transaction(async (tx) => {
      const rapport = await tx.sessionConseil.findUnique({
        where: { id: rapportId },
        select: {
          periodeFin: true,
          avancements: {
            select: {
              enseignantId: true,
              nouvellePositionId: true,
              statutDecision: true,
              enseignant: { select: { nom: true, prenom: true, positionActuelleId: true } },
            },
          },
        },
      })
      if (!rapport) return { message: RAPPORT_INTROUVABLE }

      const propager = !memeJour(rapport.periodeFin, saisie.periodeFin)
      if (propager) {
        const refus = erreurChangementFinDePeriode(
          rapport.avancements.map((a) => ({
            nom: a.enseignant.nom,
            prenom: a.enseignant.prenom,
            statutDecision: a.statutDecision,
            positionActuelleId: a.enseignant.positionActuelleId,
            nouvellePositionId: a.nouvellePositionId,
          }))
        )
        if (refus) return { message: refus }
      }

      await tx.sessionConseil.update({ where: { id: rapportId }, data: saisie })

      if (!propager || rapport.avancements.length === 0) {
        return { message: INFORMATIONS_MISES_A_JOUR, succes: true }
      }

      // La date de fin est la date d'effet de chaque avancement et de l'échelon de chaque
      // enseignant concerné (voir validerRapport) : les deux suivent, ou aucun.
      await tx.historiqueAvancement.updateMany({
        where: { sessionId: rapportId },
        data: { dateNouvelEffet: saisie.periodeFin },
      })
      await tx.enseignant.updateMany({
        where: { id: { in: rapport.avancements.map((a) => a.enseignantId) } },
        data: { dateEffetEchelon: saisie.periodeFin },
      })
      const n = rapport.avancements.length
      return {
        message: `${INFORMATIONS_MISES_A_JOUR} La nouvelle date d’effet (${formaterDateCourte(saisie.periodeFin)}) a été reportée sur ${n} avancement${n > 1 ? 's' : ''}.`,
        succes: true,
      }
    }, OPTIONS_TRANSACTION)
  } catch (erreur) {
    // La transaction est annulée en bloc : ni le rapport ni les dates n'ont changé.
    return {
      message: messageErreur(erreur, 'mettreAJourRapport', {
        introuvable: RAPPORT_INTROUVABLE,
        delai: MODIFICATION_TROP_LONGUE,
      }),
    }
  }

  if (etat.succes) {
    revalidatePath('/avancements')
    revalidatePath(`/avancements/${rapportId}`)
  }
  return etat
}

export async function modifierSelection(
  rapportId: string,
  selectionId: string,
  _prevState: EtatFormulaireAvancement,
  formData: FormData
): Promise<EtatFormulaireAvancement> {
  await exigerUtilisateur()
  const saisie = PositionProposeeSchema.safeParse(Object.fromEntries(formData))
  if (!saisie.success) return erreursDeSaisie(saisie.error)
  const { positionProposeeId } = saisie.data

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

  try {
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
    }, OPTIONS_TRANSACTION)
  } catch (erreur) {
    // La transaction est annulée en bloc : ni la proposition ni la fiche n'ont changé.
    return {
      message: messageErreur(erreur, 'modifierSelection', {
        introuvable: 'Cette sélection n’existe plus. Rechargez la page.',
        delai: MODIFICATION_TROP_LONGUE,
      }),
    }
  }

  revalidatePath(`/avancements/${rapportId}`)
  return { message: 'Position proposée mise à jour.', succes: true }
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
  }, OPTIONS_TRANSACTION)

  revalidatePath(`/avancements/${rapportId}`)
}

export async function supprimerRapport(
  rapportId: string,
  _prevState: EtatFormulaireAvancement,
  _formData: FormData
): Promise<EtatFormulaireAvancement> {
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
    }, OPTIONS_TRANSACTION)
  } catch (erreur) {
    // La transaction est annulée en bloc : rien n'a été supprimé.
    console.error('supprimerRapport : échec de la suppression', erreur)
    return {
      message:
        "La suppression a échoué. Le rapport n'a pas été modifié ; réessayez, ou contactez le responsable technique si le problème persiste.",
    }
  }

  revalidatePath('/avancements')
  redirect(avecMessage('/avancements', 'rapport_supprime'))
}

export async function rejeterRapport(rapportId: string, formData: FormData): Promise<void> {
  await exigerUtilisateur()
  const saisie = RejetRapportSchema.safeParse(Object.fromEntries(formData))
  // Le champ est obligatoire dans le formulaire : sans motif lisible, rien n'est enregistré.
  if (!saisie.success) return
  await prisma.sessionConseil.update({
    where: { id: rapportId },
    data: { motifRejet: saisie.data.motif },
  })
  revalidatePath(`/avancements/${rapportId}`)
}

export async function validerRapport(
  rapportId: string,
  _prevState: EtatFormulaireAvancement,
  formData: FormData
): Promise<EtatFormulaireAvancement> {
  await exigerUtilisateur()
  const saisie = ValidationRapportSchema.safeParse(Object.fromEntries(formData))
  if (!saisie.success) return erreursDeSaisie(saisie.error)
  const { dateValidation, auteurValidation } = saisie.data

  // Enseignants que l'utilisateur a déjà vus dans la liste d'exclusion et accepté de laisser de côté.
  const exclusionsConfirmees = new Set(saisie.data.exclusionsConfirmees)

  // Les enseignants sont relus dans la transaction qui valide : les sélections datent de la
  // création du rapport et peuvent être périmées (voir selectionsAValider.ts).
  let refus: EtatFormulaireAvancement | null
  try {
    refus = await prisma.$transaction(async (tx): Promise<EtatFormulaireAvancement | null> => {
      const rapport = await tx.sessionConseil.findUnique({
        where: { id: rapportId },
        include: {
          selections: {
            include: {
              enseignant: { include: { positionActuelle: true } },
              positionProposee: true,
            },
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

      // Une seule écriture pour tout l'historique : une par enseignant allongeait la transaction
      // d'autant d'allers-retours avec la base (voir OPTIONS_TRANSACTION). Les fiches, elles,
      // reçoivent chacune une position différente et s'écrivent une à une.
      await tx.historiqueAvancement.createMany({
        data: valides.map(({ ligne: s }) => ({
          enseignantId: s.enseignantId,
          sessionId: rapport.id,
          anciennePositionId: s.enseignant.positionActuelleId,
          dateAncienEffet: s.enseignant.dateEffetEchelon,
          nouvellePositionId: s.positionProposeeId,
          dateNouvelEffet: rapport.periodeFin,
        })),
      })
      for (const { ligne: s } of valides) {
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
      if (perimees.length > 0) {
        await tx.selectionAvancement.deleteMany({
          where: { id: { in: perimees.map(({ ligne: s }) => s.id) } },
        })
      }
      await tx.sessionConseil.update({
        where: { id: rapportId },
        data: { statut: 'VALIDE', motifRejet: null, dateValidation, auteurValidation },
      })
      return null
    }, OPTIONS_TRANSACTION)
  } catch (erreur) {
    // La transaction est annulée en bloc : aucun avancement n'est enregistré, aucune fiche
    // modifiée, le rapport reste un brouillon.
    return {
      message: messageErreur(erreur, 'validerRapport', { delai: VALIDATION_TROP_LONGUE }),
    }
  }
  if (refus) return refus

  revalidatePath('/avancements')
  redirect(avecMessage(`/avancements/${rapportId}`, 'rapport_valide'))
}

export async function genererDecision(
  avancementId: string,
  _prevState: EtatFormulaireAvancement
): Promise<EtatFormulaireAvancement> {
  await exigerUtilisateur()
  const avancement = await chargerAvancementPourDecision(avancementId)
  if (!avancement?.session) return { message: 'Avancement ou session introuvable.' }
  // Une décision signée porte son numéro et sa date : un brouillon ne doit ni la remplacer
  // ni la remettre « en attente ».
  if (avancement.statutDecision === 'VALIDEE') {
    return { message: 'Cette décision est déjà signée : elle ne peut plus être régénérée.' }
  }

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
  return { message: 'Brouillon généré.', succes: true }
}

export async function validerDecision(
  avancementId: string,
  _prevState: EtatFormulaireAvancement,
  formData: FormData
): Promise<EtatFormulaireAvancement> {
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
  return { message: 'Décision signée et régénérée.', succes: true }
}
