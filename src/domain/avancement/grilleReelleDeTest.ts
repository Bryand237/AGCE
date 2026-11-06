/**
 * Les 39 paliers de la grille d'échelonnement indiciaire, copiés de `prisma/seed.ts` (le seed ne
 * s'importe pas depuis un test). Sert à vérifier que chaque position, de chaque grade, se
 * formate : aucune ne doit s'écrire « — ».
 */
export type PalierDeTest = {
  grade: 'ASSISTANT' | 'CHARGE_DE_COURS' | 'MAITRE_DE_CONFERENCES' | 'PROFESSEUR'
  sousCategorie: 'DELEGUE' | 'STAGIAIRE' | 'CLASSE_EXCEPTIONNELLE' | 'HORS_ECHELLE' | null
  classe: number | null
  echelon: number | null
  indice: number
}

const p = (
  grade: PalierDeTest['grade'],
  classe: number | null,
  echelon: number | null,
  indice: number,
  sousCategorie: PalierDeTest['sousCategorie'] = null
): PalierDeTest => ({ grade, sousCategorie, classe, echelon, indice })

export const GRILLE_REELLE: PalierDeTest[] = [
  // Assistants : des échelons, pas de classe (deux voies parallèles, d'où deux fois l'échelon 1)
  p('ASSISTANT', null, 1, 465),
  p('ASSISTANT', null, 2, 530),
  p('ASSISTANT', null, 3, 605),
  p('ASSISTANT', null, 1, 605),
  p('ASSISTANT', null, 2, 665),
  p('ASSISTANT', null, 3, 715),
  // Chargés de cours
  p('CHARGE_DE_COURS', null, null, 605, 'DELEGUE'),
  p('CHARGE_DE_COURS', null, null, 665, 'STAGIAIRE'),
  p('CHARGE_DE_COURS', 2, 1, 715),
  p('CHARGE_DE_COURS', 2, 2, 785),
  p('CHARGE_DE_COURS', 2, 3, 870),
  p('CHARGE_DE_COURS', 2, 4, 940),
  p('CHARGE_DE_COURS', 2, 5, 1005),
  p('CHARGE_DE_COURS', 2, 6, 1050),
  p('CHARGE_DE_COURS', 1, 1, 1115),
  p('CHARGE_DE_COURS', 1, 2, 1140),
  p('CHARGE_DE_COURS', 1, 3, 1200),
  p('CHARGE_DE_COURS', null, null, 1240, 'CLASSE_EXCEPTIONNELLE'),
  // Maîtres de conférences
  p('MAITRE_DE_CONFERENCES', null, null, 715, 'STAGIAIRE'),
  p('MAITRE_DE_CONFERENCES', 2, 1, 785),
  p('MAITRE_DE_CONFERENCES', 2, 2, 870),
  p('MAITRE_DE_CONFERENCES', 2, 3, 940),
  p('MAITRE_DE_CONFERENCES', 2, 4, 1005),
  p('MAITRE_DE_CONFERENCES', 2, 5, 1050),
  p('MAITRE_DE_CONFERENCES', 2, 6, 1115),
  p('MAITRE_DE_CONFERENCES', 1, 1, 1140),
  p('MAITRE_DE_CONFERENCES', 1, 2, 1200),
  p('MAITRE_DE_CONFERENCES', 1, 3, 1240),
  p('MAITRE_DE_CONFERENCES', null, null, 1300, 'CLASSE_EXCEPTIONNELLE'),
  // Professeurs
  p('PROFESSEUR', 2, 1, 940),
  p('PROFESSEUR', 2, 2, 1005),
  p('PROFESSEUR', 2, 3, 1050),
  p('PROFESSEUR', 2, 4, 1115),
  p('PROFESSEUR', 2, 5, 1140),
  p('PROFESSEUR', 1, 1, 1200),
  p('PROFESSEUR', 1, 2, 1240),
  p('PROFESSEUR', 1, 3, 1300),
  p('PROFESSEUR', null, null, 1350, 'CLASSE_EXCEPTIONNELLE'),
  p('PROFESSEUR', null, null, 1400, 'HORS_ECHELLE'),
]
