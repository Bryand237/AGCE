/**
 * Ce que renvoie une action de formulaire à l'écran (`useActionState`, `useActionConservee`) :
 * le message à afficher, les erreurs champ par champ, et si le message annonce une réussite.
 *
 * Un seul type pour toutes les actions (audit E1) : il était redéfini à l'identique dans cinq
 * fichiers d'actions. Une action qui a besoin de plus d'informations l'étend (voir
 * `EtatFormulaireAvancement`) au lieu d'en écrire un deuxième.
 */
export type EtatFormulaire = {
  /** Erreurs de validation, par nom de champ. */
  errors?: Record<string, string[]>
  message?: string
  /** Vrai quand `message` annonce une réussite (et non une erreur). */
  succes?: boolean
}
