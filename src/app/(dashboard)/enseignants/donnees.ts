import { prisma } from '@/lib/prisma'
import { calculerDateRetraitePrevue, estEligibleRetraite, estProcheRetraite } from '@/domain/enseignants/retraite'
import { recupererEffectifsParEtablissement, recupererEffectifsParGrade } from '@/lib/statistiques/effectifs'
import { formaterPosition } from '@/domain/avancement/formaterPosition'

export { recupererEffectifsParEtablissement, recupererEffectifsParGrade }

const TAILLE_PAGE = 6

type ParametresListe = {
  page?: number
  recherche?: string
  triGrade?: 'asc' | 'desc'
  triStatut?: 'asc' | 'desc'
}

export async function recupererEnseignants({
  page = 1,
  recherche,
  triGrade,
  triStatut,
}: ParametresListe) {
  const where = recherche
    ? {
        OR: [
          { nom: { contains: recherche, mode: 'insensitive' as const } },
          { prenom: { contains: recherche, mode: 'insensitive' as const } },
          { matricule: { contains: recherche, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const orderBy = triGrade ? { grade: triGrade } : triStatut ? { statut: triStatut } : { nom: 'asc' as const }

  const [enseignants, total] = await Promise.all([
    prisma.enseignant.findMany({
      where,
      orderBy,
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
      include: { departement: { include: { etablissement: true } } },
    }),
    prisma.enseignant.count({ where }),
  ])

  // "Année de retraite" : jamais stockée, toujours recalculée à la lecture
  // (voir src/domain/enseignants/retraite.ts).
  const avecRetraitePrevue = enseignants.map((e) => ({
    ...e,
    anneeRetraitePrevue: calculerDateRetraitePrevue(e.dateNaissance, e.grade).getFullYear(),
  }))

  return {
    enseignants: avecRetraitePrevue,
    page,
    totalPages: Math.max(1, Math.ceil(total / TAILLE_PAGE)),
    total,
  }
}

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
        include: { anciennePosition: true, nouvellePosition: true, session: true },
      },
    },
  })
}