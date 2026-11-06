import { prisma } from '@/lib/prisma'
import {
  calculerDateRetraitePrevue,
  estEligibleRetraite,
  estProcheRetraite,
} from '@/domain/enseignants/retraite'
import {
  recupererEffectifsParEtablissement,
  recupererEffectifsParGrade,
} from '@/lib/statistiques/effectifs'
import { formaterPosition } from '@/domain/avancement/formaterPosition'

export { recupererEffectifsParEtablissement, recupererEffectifsParGrade }

export async function recupererStatsEnseignants() {
  const [total, actifs, transferes, retraites] = await Promise.all([
    prisma.enseignant.count(),
    prisma.enseignant.count({ where: { statut: 'ACTIF' } }),
    prisma.enseignant.count({ where: { statut: 'TRANSFERE' } }),
    prisma.enseignant.count({ where: { statut: 'RETRAITE' } }),
  ])

  return { total, actifs, transferes, retraites }
}

/**
 * Enseignants actifs ayant dépassé l'âge de retraite de leur grade sans
 * être encore marqués RETRAITE — utile pour une alerte de tableau de bord.
 * Calculé en JS (pas de requête SQL sur une valeur dérivée) : à 700 lignes,
 * ça reste instantané.
 */
export async function recupererEnseignantsEligiblesRetraite() {
  const actifs = await prisma.enseignant.findMany({
    where: { statut: 'ACTIF' },
    select: { id: true, nom: true, prenom: true, dateNaissance: true, grade: true },
  })
  return actifs.filter((e) => estEligibleRetraite(e.dateNaissance, e.grade))
}

export async function recupererEnseignantsProchesRetraite() {
  const actifs = await prisma.enseignant.findMany({
    where: { statut: 'ACTIF' },
    select: { id: true, nom: true, prenom: true, dateNaissance: true, grade: true },
  })
  return actifs
    .filter((e) => estProcheRetraite(e.dateNaissance, e.grade))
    .map((e) => ({
      ...e,
      dateRetraitePrevue: calculerDateRetraitePrevue(e.dateNaissance, e.grade),
    }))
}

export async function recupererDonneesFormulaire() {
  const [etablissements, departements, departementsOrigine, grille] = await Promise.all([
    prisma.etablissement.findMany({
      select: { id: true, nom: true, abreviation: true },
      orderBy: { nom: 'asc' },
    }),
    prisma.departement.findMany({
      select: { id: true, nom: true, etablissementId: true },
      orderBy: { nom: 'asc' },
    }),
    prisma.departementOrigine.findMany({
      select: { id: true, nom: true, region: { select: { nom: true } } },
      orderBy: [{ region: { nom: 'asc' } }, { nom: 'asc' }],
    }),
    prisma.echelonIndiciaire.findMany({ orderBy: [{ grade: 'asc' }, { ordre: 'asc' }] }),
  ])

  return {
    etablissements,
    departements,
    departementsOrigine,
    grille: grille.map((l) => ({ ...l, libelle: formaterPosition(l) })),
  }
}

export async function recupererEnseignantDetail(id: string) {
  return prisma.enseignant.findUnique({
    where: { id },
    include: {
      departement: { include: { etablissement: true } },
      departementOrigine: { include: { region: true } },
      positionActuelle: true,
      historique: {
        orderBy: { dateNouvelEffet: 'desc' },
        select: {
          id: true,
          dateAncienEffet: true,
          dateNouvelEffet: true,
          numeroDecision: true,
          typeAvancement: true,
          avisCU: true,
          avisCA: true,
          observations: true,
          statutDecision: true,
          dateValidationDecision: true,
          auteurValidationDecision: true,
          creeLe: true,
          anciennePosition: {
            select: {
              id: true,
              grade: true,
              voie: true,
              classe: true,
              echelon: true,
              indice: true,
              ordre: true,
              sousCategorie: true,
            },
          },
          nouvellePosition: {
            select: {
              id: true,
              grade: true,
              voie: true,
              classe: true,
              echelon: true,
              indice: true,
              ordre: true,
              sousCategorie: true,
            },
          },
          session: {
            select: {
              id: true,
              numero: true,
              periodeDebut: true,
              periodeFin: true,
              statut: true,
              dateSignatureDecisions: true,
              dateValidation: true,
              auteurValidation: true,
            },
          },
        },
      },
      absences: {
        orderBy: { dateDebut: 'desc' },
        take: 5,
        select: { type: true, dateDebut: true, dateFin: true, statut: true },
      },
      _count: { select: { absences: true } },
    },
  })
}
