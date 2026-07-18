import { LIBELLES_GRADE } from '@/domain/enseignants/grade'

type PositionGrille = {
  grade: string
  sousCategorie: string | null
  classe: number | null
  echelon: number | null
}

const ORDINAUX_CLASSE: Record<number, string> = { 1: '1ère', 2: '2ème' }
const ORDINAUX_ECHELON: Record<number, string> = {
  1: '1er', 2: '2ème', 3: '3ème', 4: '4ème', 5: '5ème', 6: '6ème',
}

/**
 * "Stagiaire" et "Délégué" ont besoin du grade pour être corrects
 * (ex. "Maître de Conférences Stagiaire" ≠ "Chargé de Cours Stagiaire",
 * même valeur de sousCategorie) — jamais un libellé fixe sans le grade.
 */
export function formaterPosition(position: PositionGrille): string {
  const libelleGrade = LIBELLES_GRADE[position.grade] ?? position.grade
  if (position.sousCategorie === 'DELEGUE') return `${libelleGrade} Délégué`
  if (position.sousCategorie === 'STAGIAIRE') return `${libelleGrade} Stagiaire`
  if (position.sousCategorie === 'CLASSE_EXCEPTIONNELLE') return 'Classe Exceptionnelle'
  if (position.sousCategorie === 'HORS_ECHELLE') return 'Hors Échelle'
  if (position.classe && position.echelon) {
    return `${ORDINAUX_CLASSE[position.classe] ?? position.classe} Classe, ${ORDINAUX_ECHELON[position.echelon] ?? position.echelon} Échelon`
  }
  return '—'
}