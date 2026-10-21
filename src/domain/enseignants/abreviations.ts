import { normaliserTexte } from '../texte/normaliserTexte'

/**
 * Abréviations des listes imprimées (« PR », « OU »…). Elles vivent dans le code : la base ne
 * les contient pas et ne doit pas être modifiée pour cela. Une légende en bas de chaque liste
 * les explique, pour qu'aucune ne reste ambiguë.
 */
export const ABREVIATIONS_GRADE: Record<string, string> = {
  PROFESSEUR: 'PR',
  MAITRE_DE_CONFERENCES: 'MC',
  CHARGE_DE_COURS: 'CC',
  ASSISTANT: 'ASS',
}

/** Les dix régions du Cameroun, avec leur code usuel (norme ISO 3166-2:CM). */
const REGIONS: { nom: string; code: string }[] = [
  { nom: 'Adamaoua', code: 'AD' },
  { nom: 'Centre', code: 'CE' },
  { nom: 'Est', code: 'ES' },
  { nom: 'Extrême-Nord', code: 'EN' },
  { nom: 'Littoral', code: 'LT' },
  { nom: 'Nord', code: 'NO' },
  { nom: 'Nord-Ouest', code: 'NW' },
  { nom: 'Ouest', code: 'OU' },
  { nom: 'Sud', code: 'SU' },
  { nom: 'Sud-Ouest', code: 'SW' },
]

const CODE_PAR_REGION = new Map(REGIONS.map((r) => [normaliserTexte(r.nom), r.code]))

/** « PR » pour un professeur ; le code du grade tel quel s'il est inconnu. */
export function abreviationGrade(grade: string): string {
  return ABREVIATIONS_GRADE[grade] ?? grade
}

/**
 * « OU » pour « Ouest ». La comparaison ignore casse, accents et tirets (« extreme nord »
 * trouve « Extrême-Nord »). Une région inconnue est renvoyée telle quelle : mieux vaut un nom
 * complet qu'un code inventé.
 */
export function abreviationRegion(nomRegion: string): string {
  return CODE_PAR_REGION.get(normaliserTexte(nomRegion)) ?? nomRegion
}

/** Nom complet associé à un code de région, pour la légende (ou undefined si inconnu). */
export function nomRegionDepuisCode(code: string): string | undefined {
  return REGIONS.find((r) => r.code === code)?.nom
}
