import { formaterDateCourte } from '../dates/formaterDateCourte'

/**
 * Contrôle de la date de retour d'une absence : elle ne peut pas précéder le début de
 * l'absence. Un retour avant la fin prévue est admis (retour anticipé). Renvoie le message à
 * afficher, ou `undefined` si la date est cohérente.
 */
export function erreurDateRetour(dateDebut: Date, dateRetour: Date): string | undefined {
  if (dateRetour.getTime() >= dateDebut.getTime()) return undefined
  return `La date de retour ne peut pas précéder le début de l'absence (le ${formaterDateCourte(dateDebut)}).`
}
