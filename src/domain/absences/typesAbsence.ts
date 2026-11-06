import type { TypeAbsence } from '../enseignants/dossier'

/**
 * Les types d'absence qu'on peut ENREGISTRER aujourd'hui (formulaire de création, validation du
 * serveur). La base en connaît cinq (`TYPES_ABSENCE`) ; « congé administratif » et « autre » n'ont
 * ni formulaire ni gabarit de décision : les ouvrir est une décision du client. Pour ajouter un
 * type à la saisie, c'est ici, et nulle part ailleurs : le formulaire et le schéma de saisie
 * lisent cette liste, et les libellés viennent de `LIBELLES_TYPE_ABSENCE` (etatAbsence.ts).
 */
export const TYPES_ABSENCE_SAISISSABLES = [
  'MISSION',
  'CONGE_MATERNITE',
  'CONGE_MALADIE',
] as const satisfies readonly TypeAbsence[]
