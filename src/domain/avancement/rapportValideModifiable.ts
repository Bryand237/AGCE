/**
 * Une position proposée dans un rapport DÉJÀ VALIDÉ n'est plus un simple brouillon : la
 * validation a écrit la nouvelle position dans la fiche de l'enseignant et dans l'historique.
 * La corriger ne reste sûr que dans deux conditions, que ce contrôle vérifie :
 *
 * - aucune décision n'a été générée pour cet avancement (`statutDecision` vide) : le
 *   document Word déjà produit porterait sinon les anciennes positions ;
 * - l'enseignant occupe toujours la position issue de ce rapport : sinon il a avancé depuis,
 *   et la correction écraserait sa position actuelle par une position plus ancienne.
 *
 * Renvoie le message à afficher, ou `undefined` si la modification est possible.
 */
export function erreurModificationRapportValide(avancement: {
  statutDecision: string | null
  positionActuelleId: string
  nouvellePositionId: string
}): string | undefined {
  if (avancement.statutDecision !== null) {
    return 'Une décision a déjà été générée pour cet avancement : la position ne peut plus être modifiée.'
  }
  if (avancement.positionActuelleId !== avancement.nouvellePositionId) {
    return 'Cet enseignant a changé de position depuis la validation de ce rapport : le modifier écraserait sa position actuelle.'
  }
  return undefined
}
