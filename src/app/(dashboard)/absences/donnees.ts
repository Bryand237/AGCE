import { prisma } from '@/lib/prisma'
import { LIBELLES_GRADE_PLURIEL } from '@/domain/enseignants/grade'

const TAILLE_PAGE = 6
const LIBELLES_TYPE: Record<string, string> = {
  MISSION: 'Mission',
  CONGE_MATERNITE: 'Congé de maternité',
  CONGE_MALADIE: 'Congé de maladie',
}

/** Fait basculer en DEPASSE toute absence EN_PERIODE dont la fin est
 * passée. Appelée au chargement du tableau de bord — voir l'analyse sur
 * pourquoi il n'y a pas de tâche de fond ici. */
export async function synchroniserStatutsAbsences() {
  await prisma.absence.updateMany({
    where: { statut: 'EN_PERIODE', dateFin: { lt: new Date() } },
    data: { statut: 'DEPASSE' },
  })
}

export async function recupererStatsAbsences() {
  const [total, enAttente, enPeriode, depasse] = await Promise.all([
    prisma.absence.count(),
    prisma.absence.count({ where: { statut: 'EN_ATTENTE' } }),
    prisma.absence.count({ where: { statut: 'EN_PERIODE' } }),
    prisma.absence.count({ where: { statut: 'DEPASSE' } }),
  ])
  return { total, enAttente, enPeriode, depasse }
}

export async function recupererEffectifsAbsenceParGradeSexe() {
  const absences = await prisma.absence.findMany({
    where: { statut: { not: 'TERMINE' } },
    include: { enseignant: { select: { grade: true, sexe: true } } },
  })
  const parGrade = new Map<string, { masculin: number; feminin: number }>()
  for (const a of absences) {
    const e = parGrade.get(a.enseignant.grade) ?? { masculin: 0, feminin: 0 }
    if (a.enseignant.sexe === 'M') e.masculin += 1
    else e.feminin += 1
    parGrade.set(a.enseignant.grade, e)
  }
  return Object.entries(LIBELLES_GRADE_PLURIEL).map(([grade, nom]) => ({
    nom,
    masculin: parGrade.get(grade)?.masculin ?? 0,
    feminin: parGrade.get(grade)?.feminin ?? 0,
  }))
}

// Le composant radar existant attend une clé "grade" pour son libellé —
// ajuste le nom si le tien diffère, la forme des données compte plus que le nom.
export async function recupererEffectifsParType() {
  const comptes = await prisma.absence.groupBy({ by: ['type'], where: { statut: { not: 'TERMINE' } }, _count: true })
  return Object.entries(LIBELLES_TYPE).map(([type, nom]) => ({
    grade: nom,
    effectif: comptes.find((c) => c.type === type)?._count ?? 0,
  }))
}

export async function recupererAbsences({ page = 1, recherche, tri }: { page?: number; recherche?: string; tri?: 'grade' | 'statut' }) {
  const where = recherche
    ? {
        OR: [
          { enseignant: { nom: { contains: recherche, mode: 'insensitive' as const } } },
          { enseignant: { matricule: { contains: recherche, mode: 'insensitive' as const } } },
        ],
      }
    : {}
  const orderBy =
    tri === 'grade' ? { enseignant: { grade: 'asc' as const } } : tri === 'statut' ? { statut: 'asc' as const } : { dateDebut: 'desc' as const }

  const [absences, total] = await Promise.all([
    prisma.absence.findMany({ where, orderBy, skip: (page - 1) * TAILLE_PAGE, take: TAILLE_PAGE, include: { enseignant: true } }),
    prisma.absence.count({ where }),
  ])
  return { absences, page, totalPages: Math.max(1, Math.ceil(total / TAILLE_PAGE)) }
}

export async function recupererAbsenceDetail(id: string) {
  return prisma.absence.findUnique({
    where: { id },
    include: { enseignant: { include: { departement: { include: { etablissement: true } } } } },
  })
}