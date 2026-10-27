/**
 * La partie « classe / échelon » de la notation d'une position de la grille :
 *   - « 2C/6E » : 2ème classe, 6ème échelon ;
 *   - « 1E »    : 1er échelon, quand le palier n'a pas de classe — c'est le cas des Assistants,
 *                 dont les échelons 1 à 3 n'ont pas de classe (leur indice les distingue de la voie
 *                 « sans thèse » à la voie « avec thèse ») ;
 *   - `null`    : pas d'échelon numéroté (Délégué, Stagiaire, Classe Exceptionnelle, Hors Échelle).
 *
 * Seul endroit où cette règle est écrite : les formats compact et officiel la partagent.
 */
export function notationClasseEchelon(position: {
  classe: number | null
  echelon: number | null
}): string | null {
  if (position.echelon == null) return null
  return position.classe == null
    ? `${position.echelon}E`
    : `${position.classe}C/${position.echelon}E`
}
