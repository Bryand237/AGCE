/**
 * Les deux sortes d'établissements, et leur libellé à l'écran. Définis ici une seule fois (audit
 * E1) : la liste, la fiche, le formulaire et la validation les écrivaient chacun de leur côté.
 */
export const TYPES_ETABLISSEMENT = ['ECOLE', 'FACULTE'] as const
export type TypeEtablissement = (typeof TYPES_ETABLISSEMENT)[number]

export const LIBELLES_TYPE_ETABLISSEMENT: Record<TypeEtablissement, string> = {
  ECOLE: 'École',
  FACULTE: 'Faculté',
}
