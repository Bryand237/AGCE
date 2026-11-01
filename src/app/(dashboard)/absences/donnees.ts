import { prisma } from '@/lib/prisma'
import { LIBELLES_GRADE_PLURIEL } from '@/domain/enseignants/grade'
import { TAILLE_PAGE } from '@/lib/constantes'
import { effectifsParType } from '@/domain/absences/effectifsParType'
import { RANG_STATUT, statutEffectif } from '@/domain/absences/statutEffectif'
import { aujourdhui } from '@/domain/dates/jourCivil'

// Le statut « dépassé » n'est jamais écrit en base : il se déduit de la date de fin à chaque
// lecture (voir statutEffectif). Une absence validée est « en période » ou « dépassée » selon que
// son dernier jour est passé ou non, quelle que soit la valeur enregistrée.
const VALIDEES = { statut: { in: ['EN_PERIODE', 'DEPASSE'] as ('EN_PERIODE' | 'DEPASSE')[] } }

/**
 * Les compteurs de la page des absences, au jour `jour` (aujourd'hui par défaut). Ne modifie
 * rien en base.
 */
export async function recupererStatsAbsences(jour: Date = aujourdhui()) {
  const [total, enAttente, enPeriode, depasse] = await Promise.all([
    prisma.absence.count(),
    prisma.absence.count({ where: { statut: 'EN_ATTENTE' } }),
    prisma.absence.count({ where: { ...VALIDEES, dateFin: { gte: jour } } }),
    prisma.absence.count({ where: { ...VALIDEES, dateFin: { lt: jour } } }),
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
  const comptes = await prisma.absence.groupBy({
    by: ['type'],
    where: { statut: { not: 'TERMINE' } },
    _count: true,
  })
  return effectifsParType(comptes.map((c) => ({ type: c.type, effectif: c._count }))).map(
    ({ libelle, effectif }) => ({ grade: libelle, effectif })
  )
}

const SELECTION_LISTE = {
  id: true,
  type: true,
  dateDebut: true,
  dateFin: true,
  statut: true,
  enseignant: { select: { id: true, nom: true, prenom: true, matricule: true } },
} as const

/**
 * Une page de la liste des absences. Le `statut` de chaque ligne est le statut EFFECTIF au jour
 * `jour` (voir statutEffectif), pas la valeur enregistrée : « Dépassé » apparaît dès que la fin
 * est passée, sans attendre qu'une écriture le fasse.
 */
export async function recupererAbsences({
  page = 1,
  recherche,
  tri,
  jour = aujourdhui(),
}: {
  page?: number
  recherche?: string
  tri?: 'grade' | 'statut'
  jour?: Date
}) {
  const where = recherche
    ? {
        OR: [
          { enseignant: { nom: { contains: recherche, mode: 'insensitive' as const } } },
          { enseignant: { matricule: { contains: recherche, mode: 'insensitive' as const } } },
        ],
      }
    : {}

  /**
   * Tri par statut EFFECTIF : la base ne peut pas trier sur une valeur calculée avec la date du
   * jour. On lit donc, pour toute la sélection, les seules colonnes utiles au tri (un
   * identifiant, un statut et deux dates par ligne), on ordonne en mémoire, puis on ne charge en
   * détail que les lignes de la page demandée. Dans chaque statut, les plus récentes d'abord.
   */
  async function pageTrieeParStatut() {
    const toutes = await prisma.absence.findMany({
      where,
      select: { id: true, statut: true, dateDebut: true, dateFin: true },
    })
    const ordonnees = toutes
      .map((ligne) => ({
        id: ligne.id,
        rang: RANG_STATUT[statutEffectif(ligne, jour)],
        debut: ligne.dateDebut.getTime(),
      }))
      .sort((a, b) => a.rang - b.rang || b.debut - a.debut || a.id.localeCompare(b.id))

    const ids = ordonnees.slice((page - 1) * TAILLE_PAGE, page * TAILLE_PAGE).map((l) => l.id)
    const detail = await prisma.absence.findMany({
      where: { id: { in: ids } },
      select: SELECTION_LISTE,
    })
    const parId = new Map(detail.map((ligne) => [ligne.id, ligne]))
    return [ids.flatMap((id) => parId.get(id) ?? []), ordonnees.length] as const
  }

  const [lignes, total] =
    tri === 'statut'
      ? await pageTrieeParStatut()
      : await Promise.all([
          prisma.absence.findMany({
            where,
            orderBy:
              tri === 'grade'
                ? { enseignant: { grade: 'asc' as const } }
                : { dateDebut: 'desc' as const },
            skip: (page - 1) * TAILLE_PAGE,
            take: TAILLE_PAGE,
            select: SELECTION_LISTE,
          }),
          prisma.absence.count({ where }),
        ])

  const absences = lignes.map((ligne) => ({ ...ligne, statut: statutEffectif(ligne, jour) }))
  return { absences, page, totalPages: Math.max(1, Math.ceil(total / TAILLE_PAGE)) }
}

export async function recupererAbsenceDetail(id: string) {
  return prisma.absence.findUnique({
    where: { id },
    select: {
      id: true,
      dateDebut: true,
      dateFin: true,
      dateRetour: true,
      type: true,
      statut: true,
      statutAttestation: true,
      numeroDecision: true,
      motif: true,
      dateValidation: true,
      auteurValidation: true,
      referenceCorrespondance: true,
      dateCorrespondance: true,
      dateDemandeInteressee: true,
      dateValidationAttestation: true,
      auteurValidationAttestation: true,
      createdAt: true,
      enseignant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          matricule: true,
          grade: true,
          sexe: true,
          telephone: true,
          email: true,
          departement: {
            select: {
              id: true,
              nom: true,
              etablissement: { select: { id: true, nom: true, abreviation: true } },
            },
          },
          _count: { select: { absences: true } },
        },
      },
    },
  })
}

export async function recupererEnseignantsActifsPourAbsence() {
  return prisma.enseignant.findMany({
    where: { statut: 'ACTIF' },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    select: { id: true, nom: true, prenom: true, matricule: true },
  })
}
