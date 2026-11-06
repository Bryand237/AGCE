/**
 * Ce que la modification des métadonnées du conseil change, ou non, pour les décisions déjà
 * produites. Un brouillon de décision (en attente) est un document enregistré : il reprend les
 * nouvelles valeurs quand on le régénère. Une décision signée n'est jamais modifiée.
 */
export function notesDecisionsDejaProduites(decisions: {
  enAttente: number
  signees: number
}): string[] {
  const notes: string[] = []
  const { enAttente, signees } = decisions
  if (enAttente === 1) {
    notes.push(
      '1 brouillon de décision a déjà été généré : régénérez-le pour qu’il reprenne ces valeurs.'
    )
  } else if (enAttente > 1) {
    notes.push(
      `${enAttente} brouillons de décision ont déjà été générés : régénérez-les pour qu’ils reprennent ces valeurs.`
    )
  }
  if (signees === 1) {
    notes.push('1 décision est déjà signée : son document garde les valeurs d’origine.')
  } else if (signees > 1) {
    notes.push(
      `${signees} décisions sont déjà signées : leurs documents gardent les valeurs d’origine.`
    )
  }
  return notes
}
