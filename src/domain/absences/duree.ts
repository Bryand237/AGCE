import { debutDeJour } from '../dates/jourCivil'

const MS_PAR_JOUR = 24 * 60 * 60 * 1000

/** Durée d'une absence en jours, bornes comprises : un congé d'un seul jour dure 1 jour. */
export function dureeEnJours(debut: Date, fin: Date): number {
  return Math.max(1, Math.round((fin.getTime() - debut.getTime()) / MS_PAR_JOUR) + 1)
}

/**
 * Jours restants avant la fin d'une absence, comptés depuis `jour` (le plus souvent
 * `aujourdhui()`) : 1 la veille de la fin, 0 le jour même et après. Les deux dates sont ramenées à
 * leur jour UTC : l'heure qu'elles pourraient porter ne change pas le compte.
 */
export function nombreDeJoursRestants(fin: Date, jour: Date): number {
  const ecart = debutDeJour(fin).getTime() - debutDeJour(jour).getTime()
  return Math.max(0, Math.round(ecart / MS_PAR_JOUR))
}
