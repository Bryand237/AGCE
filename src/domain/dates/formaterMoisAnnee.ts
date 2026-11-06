const FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * Mois et année en français (« juillet 2025 »), lus en UTC comme `formaterDateCourte` : une date
 * enregistrée au 1er juillet à minuit UTC reste « juillet » sur un serveur réglé à l'ouest de
 * l'UTC, où `toLocaleDateString()` sans fuseau donnerait « juin ».
 */
export function formaterMoisAnnee(date: Date): string {
  return FORMAT.format(date)
}
