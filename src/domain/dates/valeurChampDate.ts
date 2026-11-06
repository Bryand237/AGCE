import { formaterDateIso } from './jourCivil'

/**
 * La valeur d'un champ date (« AAAA-MM-JJ ») pour une date enregistrée, lue en UTC comme toutes
 * les dates de l'application. Une date absente ou illisible donne un champ vide.
 *
 * C'est la seule écriture de cette conversion : elle existait en deux exemplaires qui avaient
 * divergé (l'un acceptait du texte et le vide, l'autre seulement une `Date`), plus cinq copies en
 * ligne (audit E1).
 */
export function valeurChampDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const lue = typeof date === 'string' ? new Date(date) : date
  return Number.isNaN(lue.getTime()) ? '' : formaterDateIso(lue)
}
