import type { EchelonIndiciaire } from '@/generated/prisma/client'
import { notationClasseEchelon } from './notationPosition'

type Position = Pick<EchelonIndiciaire, 'grade' | 'classe' | 'echelon' | 'indice' | 'sousCategorie'>

const LIBELLES_SOUS_CATEGORIE: Record<string, string> = {
  DELEGUE: 'Délégué',
  STAGIAIRE: 'Stagiaire',
  CLASSE_EXCEPTIONNELLE: 'Classe Exceptionnelle',
  HORS_ECHELLE: 'Hors Échelle',
}

/**
 * Format officiel C/E/Ind. (ex. "2C/4E/940" ; "1E/465" pour un Assistant, qui n'a pas de classe) —
 * construit uniquement à partir de la ligne EchelonIndiciaire, jamais recalculé indépendamment.
 */
export function formaterClasseEchelonIndice(position: Position): string {
  if (position.sousCategorie) {
    return `${LIBELLES_SOUS_CATEGORIE[position.sousCategorie] ?? position.sousCategorie}/${position.indice}`
  }
  const classeEchelon = notationClasseEchelon(position)
  return classeEchelon ? `${classeEchelon}/${position.indice}` : `—/${position.indice}`
}
