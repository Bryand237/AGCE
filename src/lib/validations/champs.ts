import { z } from 'zod'
import './messages-fr'

/**
 * Briques communes des schémas de saisie.
 *
 * Importer ce fichier (et non `zod` seul) garantit que les messages sont en français, car il
 * charge `messages-fr.ts`.
 */

/**
 * Un <input> de type date envoie « 2018-09-01 » ; vide, absent ou incompréhensible, il est
 * refusé. Un champ absent de la requête (FormData.get() renvoie alors `null`) est traité comme
 * « absent » : sans cela, `new Date(null)` le transformerait silencieusement en 01/01/1970.
 */
export const date = (libelle: string) =>
  z.preprocess(
    (v) => (v === null ? undefined : v),
    z.coerce.date({ errorMap: () => ({ message: `${libelle} est invalide ou absente.` }) })
  )

/**
 * Texte obligatoire. Les espaces autour sont retirés AVANT le contrôle : une saisie réduite
 * à des espaces est refusée, au lieu d'être enregistrée comme un nom « vide ».
 */
export const texteObligatoire = (message: string) => z.string().trim().min(1, message)

/**
 * Texte facultatif : un champ laissé vide (ou réduit à des espaces) vaut `undefined`.
 * Un <input> vide envoie une chaîne vide en FormData, jamais « absent » : .optional() seul
 * ne suffit donc pas à obtenir `undefined`.
 */
export const texteOptionnel = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))

/** Premier message d'une erreur de validation, pour les formulaires qui n'affichent qu'une ligne. */
export function premierMessage(erreur: z.ZodError): string {
  return erreur.issues[0]?.message ?? 'Saisie invalide.'
}

/**
 * Réponse d'une action dont la saisie est invalide : les erreurs par champ (pour les
 * formulaires qui les affichent sous chaque champ) ET le premier message (pour ceux qui
 * n'ont qu'une ligne d'erreur). Un formulaire qui n'afficherait ni l'un ni l'autre
 * échouerait sans rien dire.
 */
export function erreursDeSaisie(erreur: z.ZodError): {
  errors: Record<string, string[]>
  message: string
} {
  return {
    errors: erreur.flatten().fieldErrors as Record<string, string[]>,
    message: premierMessage(erreur),
  }
}
