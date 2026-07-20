import type { EchelonIndiciaire } from '@/generated/prisma/client'

type Position = Pick<
  EchelonIndiciaire,
  'grade' | 'classe' | 'echelon' | 'indice' | 'sousCategorie'
>

const LIBELLES_SOUS_CATEGORIE: Record<string, string> = {
  DELEGUE: 'Délégué',
  STAGIAIRE: 'Stagiaire',
  CLASSE_EXCEPTIONNELLE: 'Classe Exceptionnelle',
  HORS_ECHELLE: 'Hors Échelle',
}

/**
 * Format officiel C/E/Ind. (ex. "2C/4E/940") — construit uniquement à partir
 * de la ligne EchelonIndiciaire, jamais recalculé indépendamment.
 */
export function formaterClasseEchelonIndice(position: Position): string {
  if (position.sousCategorie) {
    return `${LIBELLES_SOUS_CATEGORIE[position.sousCategorie] ?? position.sousCategorie}/${position.indice}`
  }
  if (position.classe != null && position.echelon != null) {
    return `${position.classe}C/${position.echelon}E/${position.indice}`
  }
  return `—/${position.indice}`
}
