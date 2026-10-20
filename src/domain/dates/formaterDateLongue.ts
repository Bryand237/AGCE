const MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' })

/**
 * Date en toutes lettres comme dans les décisions : « 14 avril 2026 », « 1er juillet 2023 ».
 *
 * - Le premier du mois s'écrit « 1er », comme « Article 1er » : « 1 juillet » est une faute dans
 *   un acte officiel.
 * - La date est lue en UTC, comme `formaterDateCourte` : les dates sont enregistrées à minuit UTC,
 *   et `toLocaleDateString()` sans fuseau afficherait la veille (« 13 avril ») sur un serveur
 *   réglé à l'ouest de l'UTC.
 *
 * Renvoie une chaîne vide quand la date manque : le document garde alors un blanc à remplir.
 */
export function formaterDateLongue(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return ''
  const jour = date.getUTCDate()
  return `${jour === 1 ? '1er' : jour} ${MOIS.format(date)} ${date.getUTCFullYear()}`
}
