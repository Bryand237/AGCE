// src/domain/absences/formaterDureeSemaines.ts
const NOMBRES_EN_LETTRES: Record<number, string> = {
  1: 'une',
  2: 'deux',
  3: 'trois',
  4: 'quatre',
  5: 'cinq',
  6: 'six',
  7: 'sept',
  8: 'huit',
  9: 'neuf',
  10: 'dix',
  11: 'onze',
  12: 'douze',
  13: 'treize',
  14: 'quatorze',
  15: 'quinze',
  16: 'seize',
  17: 'dix-sept',
  18: 'dix-huit',
  19: 'dix-neuf',
  20: 'vingt',
  // Au-delà de 20 semaines, un congé maladie sort du cas courant — on retombe
  // sur le chiffre seul plutôt que de deviner l'orthographe en toutes lettres.
}

/** "douze (12)" — format utilisé dans les décisions déjà générées par l'appli
 * (voir la clause "quatre (04) semaines avant..." du congé maternité). */
export function formaterDureeSemaines(semaines: number): string {
  const lettres = NOMBRES_EN_LETTRES[semaines]
  return lettres ? `${lettres} (${semaines.toString().padStart(2, '0')})` : `${semaines}`
}

export function calculerDureeSemaines(dateDebut: Date, dateFin: Date): number {
  const jours = Math.round((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
  return Math.round(jours / 7)
}
