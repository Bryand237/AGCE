import { prisma } from '@/lib/prisma'
import { LIBELLES_GRADE_PLURIEL } from '@/domain/enseignants/grade'
import { bornerPage } from '@/lib/pagination'
import { analyserDateIso } from '@/domain/dates/jourCivil'
import { contientTousLesMots, recherchePeutRestreindre } from '@/domain/texte/contientTousLesMots'

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
  return {
    total,
    valides,
    brouillons,
    enseignantsCeSemestre: dernierRapport?._count.selections ?? 0,
  }
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

/**
 * Le filtre de la recherche libre de la liste des rapports.
 *
 * - Une date « AAAA-MM-JJ » exacte (le format indiqué dans le champ) : les rapports dont la
 *   période contient ce jour.
 * - Toute autre saisie : l'édition (« 54ème »), chaque mot devant s'y retrouver, sans tenir compte
 *   de la casse ni des accents (« 54eme » trouve « 54ème »).
 *
 * Seule une date AAAA-MM-JJ valide est lue comme une date. Avant, tout ce que `new Date()`
 * acceptait l'était : « 54 », « 2026 » ou « 2026-003 » donnaient une date, et la recherche
 * d'une édition renvoyait les rapports d'une période au lieu de l'édition.
 *
 * La base ne compare pas sans les accents : les éditions (une ou deux par an) sont lues puis
 * filtrées ici, et la requête porte sur leurs identifiants.
 */
async function filtreDeRecherche(recherche: string | undefined) {
  const saisie = (recherche ?? '').trim()
  if (!recherchePeutRestreindre(saisie)) return {}

  const jour = analyserDateIso(saisie)
  if (jour) return { periodeDebut: { lte: jour }, periodeFin: { gte: jour } }

  const editions = await prisma.sessionConseil.findMany({ select: { id: true, numero: true } })
  const ids = editions.filter((e) => contientTousLesMots(saisie, [e.numero])).map((e) => e.id)
  return { id: { in: ids } }
}

export async function recupererRapports({
  page = 1,
  recherche,
}: {
  page?: number
  recherche?: string
}) {
  const where = await filtreDeRecherche(recherche)

  // Le total d'abord : la page demandée est ramenée dans les limites avant d'être lue.
  const pagination = bornerPage(page, await prisma.sessionConseil.count({ where }))
  const rapports = await prisma.sessionConseil.findMany({
    where,
    // L'identifiant départage deux rapports de même début : sinon une ligne peut apparaître sur
    // deux pages (ou sur aucune) d'une requête à l'autre.
    orderBy: [{ periodeDebut: 'desc' }, { id: 'asc' }],
    skip: pagination.skip,
    take: pagination.take,
    include: { _count: { select: { selections: true } } },
  })
  return { rapports, page: pagination.page, totalPages: pagination.totalPages }
}

export async function recupererGrilleEchelonIndiciaire() {
  return prisma.echelonIndiciaire.findMany({
    orderBy: [{ grade: 'asc' }, { ordre: 'asc' }],
  })
}

export async function recupererEnseignantsActifsPourAvancement() {
  return prisma.enseignant.findMany({
    where: { statut: 'ACTIF' },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    select: { id: true, matricule: true, nom: true, prenom: true },
  })
}

export async function recupererRapportDetail(id: string) {
  return prisma.sessionConseil.findUnique({
    where: { id },
    include: {
      selections: {
        orderBy: { enseignant: { nom: 'asc' } },
        include: {
          enseignant: {
            include: { departement: { include: { etablissement: true } }, positionActuelle: true },
          },
          positionProposee: true,
        },
      },
      avancements: {
        orderBy: { enseignant: { nom: 'asc' } },
        select: {
          id: true,
          statutDecision: true,
          dateAncienEffet: true,
          dateNouvelEffet: true,
          numeroDecision: true,
          avisCU: true,
          avisCA: true,
          observations: true,
          enseignant: {
            select: { id: true, matricule: true, nom: true, prenom: true, grade: true },
          },
          anciennePosition: {
            select: {
              id: true,
              grade: true,
              classe: true,
              echelon: true,
              indice: true,
              ordre: true,
              sousCategorie: true,
              voie: true,
            },
          },
          nouvellePosition: {
            select: {
              id: true,
              grade: true,
              classe: true,
              echelon: true,
              indice: true,
              ordre: true,
              sousCategorie: true,
              voie: true,
            },
          },
        },
      },
    },
  })
}

export async function recupererAvancementDetail(rapportId: string, avancementId: string) {
  return prisma.historiqueAvancement.findFirst({
    where: { id: avancementId, sessionId: rapportId },
    select: {
      statutDecision: true,
      id: true,
      dateAncienEffet: true,
      dateNouvelEffet: true,
      numeroDecision: true,
      avisCU: true,
      avisCA: true,
      observations: true,
      enseignant: { select: { id: true, matricule: true, nom: true, prenom: true, grade: true } },
      anciennePosition: {
        select: {
          id: true,
          grade: true,
          classe: true,
          echelon: true,
          indice: true,
          ordre: true,
          sousCategorie: true,
          voie: true,
        },
      },
      nouvellePosition: {
        select: {
          id: true,
          grade: true,
          classe: true,
          echelon: true,
          indice: true,
          ordre: true,
          sousCategorie: true,
          voie: true,
        },
      },
      session: { select: { id: true, numero: true, periodeDebut: true, periodeFin: true } },
    },
  })
}
