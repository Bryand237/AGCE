/**
 * Date lisible à l'écran : « 2 novembre 2026 », « 1 janvier 2027 ».
 *
 * La date est lue en UTC, comme `formaterDateCourte` : les dates sont enregistrées à minuit UTC, et
 * `toLocaleDateString()` sans fuseau afficherait la veille sur une machine réglée à l'ouest de
 * l'UTC. Les décisions et attestations, elles, écrivent « 1er » : voir `formaterDateLongue`.
 *
 * Renvoie une chaîne vide quand la date manque ou n'est pas valide.
 */
export function formaterDateMoisEnLettres(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return ''
  // Un formateur par appel : le fuseau par défaut d'un `Intl.DateTimeFormat` est fixé à sa
  // création, et le test change de fuseau en cours de route.
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
