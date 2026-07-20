type PositionGrille = {
  grade: string
  sousCategorie: string | null
  classe: number | null
  echelon: number | null
  indice: number
}

/**
 * Formate une position de grille en notation compacte C/E/Ind.
 * Exemple : "2C/6E/1115" pour 2ème Classe, 6ème Échelon, indice 1115.
 * Utilisé dans le tableau récapitulatif du rapport d'avancement,
 * distinct du format long ("2ème Classe, 6ème Échelon") des décisions individuelles.
 */
export function formaterPositionCompacte(position: PositionGrille): string {
  if (position.sousCategorie === 'DELEGUE') return 'Délégué'
  if (position.sousCategorie === 'STAGIAIRE') return 'Stagiaire'
  if (position.sousCategorie === 'CLASSE_EXCEPTIONNELLE') return 'Cl. Exc.'
  if (position.sousCategorie === 'HORS_ECHELLE') return 'Hors Éch.'
  if (position.classe && position.echelon) {
    return `${position.classe}C/${position.echelon}E/${position.indice}`
  }
  return '—'
}
