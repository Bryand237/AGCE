import { debutDeJour, dernierJourDAnnee, premierJourDAnnee } from './jourCivil'

/**
 * Plage de jours, bornes incluses. Une borne absente n'est pas contraignante : { du } veut dire
 * « à partir de », { au } « jusqu'à », {} « sans condition ».
 */
export type PlageDates = { du?: Date; au?: Date }

export function plageEstVide(plage: PlageDates): boolean {
  return plage.du === undefined && plage.au === undefined
}

/** Toute l'année : du 1er janvier au 31 décembre. */
export function plageDeLAnnee(annee: number): PlageDates {
  return { du: premierJourDAnnee(annee), au: dernierJourDAnnee(annee) }
}

/**
 * Intersection de deux plages (« année 2027 » ET « à partir du 1er juin » donne juin à
 * décembre). Deux plages qui ne se recoupent pas donnent une plage où plus aucune date ne
 * tombe : le résultat est alors vide de sens, jamais élargi en silence.
 */
export function croiserPlages(a: PlageDates, b: PlageDates): PlageDates {
  const du = a.du && b.du ? (a.du > b.du ? a.du : b.du) : (a.du ?? b.du)
  const au = a.au && b.au ? (a.au < b.au ? a.au : b.au) : (a.au ?? b.au)
  return { du, au }
}

/**
 * La date tombe-t-elle dans la plage ? Les jours sont comparés, pas les heures.
 * Une plage sans borne accepte tout, y compris une date absente ; dès qu'une borne existe,
 * une date absente (null) ne correspond pas.
 */
export function dansPlage(date: Date | null | undefined, plage: PlageDates): boolean {
  if (plageEstVide(plage)) return true
  if (!date) return false
  const jour = debutDeJour(date).getTime()
  if (plage.du && jour < debutDeJour(plage.du).getTime()) return false
  if (plage.au && jour > debutDeJour(plage.au).getTime()) return false
  return true
}

/**
 * Une période [debut, fin] recoupe-t-elle la plage ? (au moins un jour en commun)
 * Sert aux absences : « absent pendant le mois de novembre ».
 */
export function periodeRecoupePlage(debut: Date, fin: Date, plage: PlageDates): boolean {
  if (plage.au && debutDeJour(debut).getTime() > debutDeJour(plage.au).getTime()) return false
  if (plage.du && debutDeJour(fin).getTime() < debutDeJour(plage.du).getTime()) return false
  return true
}
