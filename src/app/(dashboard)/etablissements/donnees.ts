import { prisma } from '@/lib/prisma'
import { bornerPage } from '@/lib/pagination'

type ParametresListe = {
  page?: number
  recherche?: string
  tri?: 'asc' | 'desc'
}

/**
 * Liste paginée, filtrée et triée des établissements — pensée pour être
 * pilotée directement par les searchParams de l'URL (voir page.tsx),
 * pas par du state React. Ça garde la page en Server Component, et
 * l'URL reste partageable/navigable au bouton retour.
 */
export async function recupererEtablissements({
  page = 1,
  recherche,
  tri = 'asc',
}: ParametresListe) {
  const where = recherche ? { nom: { contains: recherche, mode: 'insensitive' as const } } : {}

  // Le total d'abord : la page demandée est ramenée dans les limites avant d'être lue.
  const total = await prisma.etablissement.count({ where })
  const pagination = bornerPage(page, total)
  const etablissements = await prisma.etablissement.findMany({
    where,
    // Peu de types distincts : sans le nom puis l'identifiant, des dizaines de lignes sont
    // « égales » et leur ordre peut changer d'une page à l'autre.
    orderBy: [{ type: tri }, { nom: 'asc' }, { id: 'asc' }],
    skip: pagination.skip,
    take: pagination.take,
    include: {
      departements: { select: { _count: { select: { enseignants: true } } } },
      _count: { select: { departements: true } },
    },
  })

  return {
    etablissements: etablissements.map((e) => ({
      ...e,
      nombreEnseignants: e.departements.reduce((somme, d) => somme + d._count.enseignants, 0),
    })),
    page: pagination.page,
    totalPages: pagination.totalPages,
    total,
  }
}

export async function recupererStatsEtablissements() {
  const [totalEtablissements, totalDepartements, totalEnseignants, parType] = await Promise.all([
    prisma.etablissement.count(),
    prisma.departement.count(),
    prisma.enseignant.count(),
    prisma.etablissement.groupBy({ by: ['type'], _count: true }),
  ])

  return {
    totalEtablissements,
    totalDepartements,
    totalEnseignants,
    ecoles: parType.find((p) => p.type === 'ECOLE')?._count ?? 0,
    facultes: parType.find((p) => p.type === 'FACULTE')?._count ?? 0,
  }
}

export async function recupererEtablissementParId(id: string) {
  return prisma.etablissement.findUnique({
    where: { id },
    include: {
      departements: {
        orderBy: { nom: 'asc' },
        include: { _count: { select: { enseignants: true } } },
      },
      _count: { select: { departements: true } },
    },
  })
}

export async function recupererEtablissementParIdPaged(id: string, page = 1, pageSize = 10) {
  const etablissement = await prisma.etablissement.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      abreviation: true,
      type: true,
      photoUrl: true,
      _count: { select: { departements: true } },
    },
  })

  if (!etablissement) return null

  const [total, totalEnseignants] = await Promise.all([
    prisma.departement.count({ where: { etablissementId: id } }),
    prisma.enseignant.count({ where: { departement: { etablissementId: id } } }),
  ])
  const pagination = bornerPage(page, total, pageSize)
  const departements = await prisma.departement.findMany({
    where: { etablissementId: id },
    orderBy: [{ nom: 'asc' }, { id: 'asc' }],
    skip: pagination.skip,
    take: pagination.take,
    include: { _count: { select: { enseignants: true } } },
  })

  return {
    etablissement,
    departements,
    totalEnseignants,
    page: pagination.page,
    totalPages: pagination.totalPages,
    total,
  }
}

// Le graphique "effectif par établissement" (recupererEffectifsParEtablissement)
// vit maintenant dans src/lib/statistiques/effectifs.ts, partagé avec le
// module Enseignants — voir ce fichier plutôt qu'une copie ici.
