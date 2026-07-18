/**
 * Référentiel des grades — un seul endroit à corriger si un libellé
 * change ou si l'ordre d'affichage doit évoluer, plutôt que de chercher
 * dans les trois fichiers qui en avaient chacun leur propre copie
 * (liste-pdf.ts, formulaire-cascade.tsx, lib/statistiques/effectifs.ts).
 */
export const LIBELLES_GRADE: Record<string, string> = {
  PROFESSEUR: 'Professeur',
  MAITRE_DE_CONFERENCES: 'Maître de Conférences',
  CHARGE_DE_COURS: 'Chargé de Cours',
  ASSISTANT: 'Assistant',
}

export const LIBELLES_GRADE_PLURIEL: Record<string, string> = {
  PROFESSEUR: 'Professeurs',
  MAITRE_DE_CONFERENCES: 'Maîtres de Conférences',
  CHARGE_DE_COURS: 'Chargés de Cours',
  ASSISTANT: 'Assistants',
}

// Ordre d'affichage voulu (identique à celui du rapport d'avancement) —
// PAS l'ordre alphabétique, et pas non plus l'ordre de déclaration de
// l'enum Grade dans schema.prisma (qui sert le tri SQL, un besoin différent).
export const ORDRE_GRADE = [
  'PROFESSEUR',
  'MAITRE_DE_CONFERENCES',
  'CHARGE_DE_COURS',
  'ASSISTANT',
] as const
