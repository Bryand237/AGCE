import { prisma } from '@/lib/prisma'
import {
  construireRepartitionParGrade,
  incrementerGrade,
  ligneGradeVide,
  type DashboardStats,
  type RepartitionParEtablissement,
  type RepartitionParGrade,
  type RepartitionParRegion,
} from '@/lib/dashboard-utils'

/** Enseignants permanents = statut ACTIF (effectif courant). */
const filtreActifs = { statut: 'ACTIF' as const }

export async function recupererStatsDashboard(): Promise<DashboardStats> {
  const [total, actifs, hommes, femmes, totalEtablissements, absencesEnCours] =
    await Promise.all([
      prisma.enseignant.count(),
      prisma.enseignant.count({ where: filtreActifs }),
      prisma.enseignant.count({ where: { ...filtreActifs, sexe: 'M' } }),
      prisma.enseignant.count({ where: { ...filtreActifs, sexe: 'F' } }),
      prisma.etablissement.count(),
      prisma.absence.count({
        where: { statut: { in: ['EN_ATTENTE', 'EN_PERIODE', 'DEPASSE'] } },
      }),
    ])

  return {
    totalEnseignants: total,
    enseignantsActifs: actifs,
    hommes,
    femmes,
    totalEtablissements,
    absencesEnCours,
  }
}

export async function recupererRepartitionParGrade(): Promise<RepartitionParGrade[]> {
  const comptes = await prisma.enseignant.groupBy({
    by: ['grade'],
    where: filtreActifs,
    _count: true,
  })

  return construireRepartitionParGrade(
    comptes.map((c) => ({ grade: c.grade, _count: c._count }))
  )
}

export async function recupererRepartitionParRegion(): Promise<RepartitionParRegion[]> {
  const enseignants = await prisma.enseignant.findMany({
    where: filtreActifs,
    select: {
      grade: true,
      departementOrigine: { select: { region: { select: { nom: true } } } },
    },
  })

  const parRegion = new Map<string, RepartitionParRegion>()

  for (const e of enseignants) {
    const region = e.departementOrigine?.region.nom ?? 'Non renseigné'
    const existant = parRegion.get(region) ?? {
      region,
      ...ligneGradeVide(),
    }
    const maj = incrementerGrade(existant, e.grade)
    parRegion.set(region, { region, ...maj })
  }

  return [...parRegion.values()].sort((a, b) => a.region.localeCompare(b.region, 'fr'))
}

export async function recupererRepartitionParEtablissement(): Promise<RepartitionParEtablissement[]> {
  const etablissements = await prisma.etablissement.findMany({
    select: {
      abreviation: true,
      departements: {
        select: {
          enseignants: {
            where: filtreActifs,
            select: { grade: true },
          },
        },
      },
    },
    orderBy: { abreviation: 'asc' },
  })

  return etablissements.map((e) => {
    const grades = e.departements.flatMap((d) => d.enseignants)
    let ligne = ligneGradeVide()
    for (const t of grades) {
      ligne = incrementerGrade(ligne, t.grade)
    }
    return { etablissement: e.abreviation, ...ligne }
  })
}
