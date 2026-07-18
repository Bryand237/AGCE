import { prisma } from '@/lib/prisma'
import { LIBELLES_GRADE_PLURIEL } from '@/domain/enseignants/grade'

const TAILLE_PAGE = 6

export async function recupererStatsRapports() {
  const [total, valides, brouillons, dernierRapport] = await Promise.all([
    prisma.sessionConseil.count(),
    prisma.sessionConseil.count({ where: { statut: 'VALIDE' } }),
    prisma.sessionConseil.count({ where: { statut: 'BROUILLON' } }),
    prisma.sessionConseil.findFirst({
      orderBy: { periodeDebut: 'desc' },
      include: { _count: { select: { selections: true } } },
    }),
  ])
  return { total, valides, brouillons, enseignantsCeSemestre: dernierRapport?._count.selections ?? 0 }
}

// Forme attendue par le composant GraphiqueEffectifsParSexe déjà existant :
// { nom, masculin, feminin }[] — "nom" y est câblé en dur comme clé de l'axe X.
export async function recupererEffectifsAvancementParGradeSexe(rapportId?: string) {
  const rapport = rapportId
    ? await prisma.sessionConseil.findUnique({ where: { id: rapportId } })
    : await prisma.sessionConseil.findFirst({ orderBy: { periodeDebut: 'desc' } })
  if (!rapport) return []

  const selections = await prisma.selectionAvancement.findMany({
    where: { rapportId: rapport.id },
    include: { enseignant: { select: { grade: true, sexe: true } } },
  })

  const parGrade = new Map<string, { masculin: number; feminin: number }>()
  for (const s of selections) {
    const e = parGrade.get(s.enseignant.grade) ?? { masculin: 0, feminin: 0 }
    if (s.enseignant.sexe === 'M') e.masculin += 1
    else e.feminin += 1
    parGrade.set(s.enseignant.grade, e)
  }

  return Object.entries(LIBELLES_GRADE_PLURIEL).map(([grade, nom]) => ({
    nom,
    masculin: parGrade.get(grade)?.masculin ?? 0,
    feminin: parGrade.get(grade)?.feminin ?? 0,
  }))
}

export async function recupererRapports({ page = 1, recherche }: { page?: number; recherche?: string }) {
  const commeDate = recherche ? new Date(recherche) : null
  const dateValide = commeDate && !isNaN(commeDate.getTime())
  const where = !recherche
    ? {}
    : dateValide
      ? { periodeDebut: { lte: commeDate! }, periodeFin: { gte: commeDate! } }
      : { numero: { contains: recherche, mode: 'insensitive' as const } }

  const [rapports, total] = await Promise.all([
    prisma.sessionConseil.findMany({
      where,
      orderBy: { periodeDebut: 'desc' },
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
      include: { _count: { select: { selections: true } } },
    }),
    prisma.sessionConseil.count({ where }),
  ])
  return { rapports, page, totalPages: Math.max(1, Math.ceil(total / TAILLE_PAGE)) }
}

export async function recupererRapportDetail(id: string) {
  return prisma.sessionConseil.findUnique({
    where: { id },
    include: {
      selections: {
        orderBy: { enseignant: { nom: 'asc' } },
        include: {
          enseignant: { include: { departement: { include: { etablissement: true } }, positionActuelle: true } },
          positionProposee: true,
        },
      },
    },
  })
}

export async function recupererAvancementDetail(rapportId: string, avancementId: string) {
  return prisma.historiqueAvancement.findFirst({
    where: { id: avancementId, sessionId: rapportId },
    include: { enseignant: true, anciennePosition: true, nouvellePosition: true, session: true },
  })
}