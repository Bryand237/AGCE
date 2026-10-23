import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { formaterDateIso } from '@/domain/dates/jourCivil'
import type { Puce } from '@/domain/enseignants/recherche/puces'

/**
 * Phrase imprimée sous le titre d'une liste exportée, pour qu'on sache ce qu'elle contient : les
 * critères sont ceux des puces de l'écran, et la date est celle du jour (« à venir », « déjà
 * passée » ou « en cours » n'ont de sens qu'à une date donnée).
 */
export function descriptionSelection(puces: readonly Puce[], jour: Date): string {
  const date = formaterDateCourte(jour)
  return puces.length === 0
    ? `Tous les enseignants — au ${date}`
    : `Sélection au ${date} — ${puces.map((puce) => puce.libelle).join(' ; ')}`
}

/** « selection-enseignants-2026-10-23.pdf » : le jour d'édition dans le nom, pour classer les fichiers. */
export function nomFichierSelection(jour: Date, extension: 'pdf' | 'csv'): string {
  return `selection-enseignants-${formaterDateIso(jour)}.${extension}`
}
