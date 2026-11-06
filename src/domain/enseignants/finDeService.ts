import { formaterDateCourte } from '../dates/formaterDateCourte'

/**
 * Contrôle de la date de fin de service (transfert, retraite) : elle ne peut pas précéder la
 * prise de service. Renvoie le message à afficher, ou `undefined` si les dates sont cohérentes
 * (une fin le jour même de la prise de service est admise).
 */
export function erreurFinDeService(
  datePriseService: Date,
  dateFinService: Date
): string | undefined {
  if (dateFinService.getTime() >= datePriseService.getTime()) return undefined
  return `La date de fin de service ne peut pas précéder la prise de service (le ${formaterDateCourte(datePriseService)}).`
}
