import { prisma } from '@/lib/prisma'
import { LIBELLES_GRADE_PLURIEL } from '@/domain/enseignants/grade'

/**
 * Effectif par établissement, scindé par sexe — utilisé à la fois par
 * le dashboard du module Établissements et celui du module Enseignants.
 * Centralisé ici plutôt que dupliqué dans les deux, pour n'avoir qu'un
 * seul endroit à corriger si la règle d'agrégation change.
 *
 * Ne compte que les enseignants ACTIF : un enseignant transféré ou
 * retraité ne fait plus partie de l'effectif courant d'un établissement,
 * même si sa fiche reste dans la base pour l'historique.
 *
 * Un enseignant se rattache à un Departement, jamais directement à un
 * Etablissement (voir schema.prisma) — d'où le passage par
 * `departements` plutôt qu'un raccourci `etablissement.enseignants`
 * qui n'existe pas. À cette échelle (~700 enseignants), regrouper en
 * JS après une seule requête est largement suffisant.
 */
export async function recupererEffectifsParEtablissement() {
  const etablissements = await prisma.etablissement.findMany({
    select: {
      abreviation: true,
      departements: {
        select: { enseignants: { select: { sexe: true, statut: true } } },
      },
    },
    orderBy: { abreviation: 'asc' },
  })

  return etablissements.map((e) => {
    const actifs = e.departements.flatMap((d) => d.enseignants).filter((t) => t.statut === 'ACTIF')
    return {
      nom: e.abreviation,
      masculin: actifs.filter((t) => t.sexe === 'M').length,
      feminin: actifs.filter((t) => t.sexe === 'F').length,
    }
  })
}

/**
 * Effectif par grade, enseignants ACTIF uniquement — module Enseignants
 * (graphique radar). Les 4 grades sont toujours présents, même à 0 :
 * `groupBy` seul omettrait silencieusement un grade sans aucun
 * enseignant actif, ce qui casserait un radar chart (axe manquant) ou
 * fausserait sa lecture.
 */
export async function recupererEffectifsParGrade() {
  const comptes = await prisma.enseignant.groupBy({
    by: ['grade'],
    where: { statut: 'ACTIF' },
    _count: true,
  })

  return Object.entries(LIBELLES_GRADE_PLURIEL).map(([grade, libelle]) => ({
    grade: libelle,
    effectif: comptes.find((c) => c.grade === grade)?._count ?? 0,
  }))
}
