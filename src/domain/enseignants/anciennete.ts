/**
 * Années de service accomplies à la date `jour` (le plus souvent `aujourdhui()`), à partir de la
 * date de prise de service. Une année est accomplie le jour anniversaire ; 0 avant la première, et
 * 0 pour une prise de service à venir.
 *
 * Calculé avec les jours UTC, comme toutes les dates enregistrées : avec les accesseurs locaux,
 * une prise de service au 1er janvier comptait une année de moins sur une machine réglée à l'ouest
 * de l'UTC (audit D8). Un 29 février a son anniversaire le 1er mars les années non bissextiles.
 */
export function ancienneteEnAnnees(datePriseService: Date, jour: Date): number {
  let annees = jour.getUTCFullYear() - datePriseService.getUTCFullYear()
  const mois = jour.getUTCMonth() - datePriseService.getUTCMonth()
  if (mois < 0 || (mois === 0 && jour.getUTCDate() < datePriseService.getUTCDate())) {
    annees--
  }
  return Math.max(0, annees)
}
