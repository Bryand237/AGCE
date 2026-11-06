export type Page<T> = {
  elements: T[]
  /** Numéro de page réellement affiché, ramené dans [1, totalPages]. */
  page: number
  totalPages: number
  total: number
}

/**
 * Découpe une liste en pages. Une page demandée hors limites (0, négative, trop grande après
 * un filtre plus strict) est ramenée à la plus proche, jamais affichée vide.
 */
export function paginer<T>(elements: readonly T[], pageDemandee: number, taille: number): Page<T> {
  const total = elements.length
  const totalPages = Math.max(1, Math.ceil(total / taille))
  const page = Math.min(Math.max(1, Math.trunc(pageDemandee) || 1), totalPages)
  return {
    elements: elements.slice((page - 1) * taille, page * taille),
    page,
    totalPages,
    total,
  }
}
