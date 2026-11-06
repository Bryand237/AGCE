import { prisma } from '@/lib/prisma'
import { LIBELLES_GRADE_PLURIEL } from '@/domain/enseignants/grade'
import { bornerPage } from '@/lib/pagination'
import { effectifsParType } from '@/domain/absences/effectifsParType'
import { RANG_STATUT, statutEffectif } from '@/domain/absences/statutEffectif'
import { aujourdhui } from '@/domain/dates/jourCivil'
import { identiteCorrespond } from '@/domain/enseignants/recherche/identite'
import { recherchePeutRestreindre } from '@/domain/texte/contientTousLesMots'

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

// Les dates se répètent (plusieurs absences le même jour) : sans l'identifiant en dernier critère,
// PostgreSQL peut ordonner les lignes égales différemment d'une requête à l'autre, et avec
// skip/take une absence apparaît sur deux pages ou sur aucune.
const ORDRE_PAR_DATE = [{ dateDebut: 'desc' as const }, { id: 'asc' as const }]

const SELECTION_LISTE = {
  id: true,
  type: true,
  dateDebut: true,
  dateFin: true,
  statut: true,
  enseignant: { select: { id: true, nom: true, prenom: true, matricule: true } },
} as const

/**
 * Le filtre de la recherche libre : les absences des enseignants dont le nom, le prénom ou le
 * matricule contient CHAQUE mot saisi, sans tenir compte de la casse ni des accents (voir
 * contientTousLesMots). « Alice Mbarga », « mbarga alice » et « mba ali » trouvent les absences
 * d'Alice MBARGA.
 *
 * La base ne sait comparer ni mots séparés ni accents (ILIKE ne les ignore pas) : on lit donc
 * l'identité des seuls enseignants qui ont une absence (quelques centaines de lignes courtes),
 * on les filtre avec la même règle que la liste des enseignants, et la requête des absences
 * porte sur leurs identifiants. Aucune écriture, aucune extension de la base.
 */
async function filtreDeRecherche(recherche: string | undefined) {
  const saisie = recherche ?? ''
  if (!recherchePeutRestreindre(saisie)) return {}
  const candidats = await prisma.enseignant.findMany({
    where: { absences: { some: {} } },
    select: { id: true, nom: true, prenom: true, matricule: true },
  })
  const ids = candidats.filter((e) => identiteCorrespond(e, saisie)).map((e) => e.id)
  return { enseignantId: { in: ids } }
}

/**
 * Une page de la liste des absences. `page` est celle qu'on demande ; celle qui est renvoyée est
 * ramenée dans les limites (voir bornerPage). Le `statut` de chaque ligne est le statut EFFECTIF au jour
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
  const where = await filtreDeRecherche(recherche)

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

    const pagination = bornerPage(page, ordonnees.length)
    const ids = ordonnees.slice(pagination.skip, pagination.skip + pagination.take).map((l) => l.id)
    const detail = await prisma.absence.findMany({
      where: { id: { in: ids } },
      select: SELECTION_LISTE,
    })
    const parId = new Map(detail.map((ligne) => [ligne.id, ligne]))
    return [ids.flatMap((id) => parId.get(id) ?? []), pagination] as const
  }

  /** Tri par colonne : le total d'abord (pour ramener la page demandée dans les limites). */
  async function pageTrieeParColonne() {
    const pagination = bornerPage(page, await prisma.absence.count({ where }))
    const lignes = await prisma.absence.findMany({
      where,
      orderBy:
        tri === 'grade'
          ? [
              { enseignant: { grade: 'asc' as const } },
              { enseignant: { nom: 'asc' as const } },
              { enseignant: { prenom: 'asc' as const } },
              ...ORDRE_PAR_DATE,
            ]
          : ORDRE_PAR_DATE,
      skip: pagination.skip,
      take: pagination.take,
      select: SELECTION_LISTE,
    })
    return [lignes, pagination] as const
  }

  const [lignes, pagination] =
    tri === 'statut' ? await pageTrieeParStatut() : await pageTrieeParColonne()

  const absences = lignes.map((ligne) => ({ ...ligne, statut: statutEffectif(ligne, jour) }))
  return { absences, page: pagination.page, totalPages: pagination.totalPages }
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
