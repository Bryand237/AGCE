import { formaterPosition } from './formaterPosition'

/**
 * Position telle qu'elle s'écrit dans une décision d'avancement : « 2ème Classe 2ème Echelon »,
 * sans virgule et sans accent sur « Echelon » (graphie des décisions originales). L'écran garde
 * `formaterPosition` (« 2ème Classe, 2ème Échelon »), plus lisible.
 */
export function formaterPositionDecision(position: Parameters<typeof formaterPosition>[0]): string {
  return formaterPosition(position).replace(', ', ' ').replace('Échelon', 'Echelon')
}
