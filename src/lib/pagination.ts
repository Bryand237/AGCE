import { TAILLE_PAGE } from '@/lib/constantes'

/**
 * Pagination des listes lues dans la base (`skip` / `take`). Pour une liste déjà chargée en
 * mémoire, voir `paginer` (domain/enseignants/recherche/paginer.ts), qui suit la même règle.
 */

/** Plus grand numéro de page accepté : au-delà, la saisie est une erreur, pas une page. */
const PAGE_MAX = 1_000_000

/**
 * Le numéro de page d'une adresse (`?page=3`), toujours un entier supérieur ou égal à 1.
 *
 * Sans cela, `Number(params.page ?? 1)` laissait passer `abc` (NaN), `0`, `-3` ou `2.5`, que
 * Prisma refuse comme valeur de `skip` : page d'erreur à la place de la liste, pour un favori
 * modifié ou une adresse saisie à la main. Une valeur invalide donne la page 1. Un paramètre
 * répété (`?page=2&page=5`) compte pour sa première valeur.
 */
export function lirePage(valeur: string | string[] | undefined): number {
  const brute = (Array.isArray(valeur) ? valeur[0] : valeur)?.trim()
  if (brute === undefined || !/^\d{1,7}$/.test(brute)) return 1
  const page = Number(brute)
  return page >= 1 && page <= PAGE_MAX ? page : 1
}

export type Pagination = {
  /** La page réellement affichée, ramenée dans [1, totalPages]. */
  page: number
  totalPages: number
  /** À passer tels quels à Prisma. */
  skip: number
  take: number
}

/**
 * Ramène la page demandée dans les pages qui existent : `?page=999` ouvre la dernière page au
 * lieu d'un tableau vide sans explication, et la même chose après un filtre plus strict.
 * À appeler avec le total (`count`) AVANT de lire la page.
 */
export function bornerPage(
  pageDemandee: number,
  total: number,
  taille: number = TAILLE_PAGE
): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / taille))
  const page = Math.min(Math.max(1, Math.trunc(pageDemandee) || 1), totalPages)
  return { page, totalPages, skip: (page - 1) * taille, take: taille }
}
