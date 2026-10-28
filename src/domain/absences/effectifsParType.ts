import { TYPES_ABSENCE, type TypeAbsence } from '../enseignants/dossier'
import { LIBELLES_TYPE_ABSENCE } from './etatAbsence'
import { TYPES_ABSENCE_SAISISSABLES } from './typesAbsence'

export type EffectifParType = { type: TypeAbsence; libelle: string; effectif: number }

/**
 * Le nombre d'absences en cours par type, pour le graphique de la page des absences. Les types
 * qu'on saisit apparaissent toujours (à zéro s'il n'y en a pas) ; « congé administratif » et
 * « autre » seulement quand une absence de ce type existe, créée autrement que par le formulaire :
 * elle ne doit pas disparaître du graphique, sans y ajouter deux axes toujours vides.
 */
export function effectifsParType(
  comptes: ReadonlyArray<{ type: TypeAbsence; effectif: number }>
): EffectifParType[] {
  const saisissables: readonly TypeAbsence[] = TYPES_ABSENCE_SAISISSABLES
  return TYPES_ABSENCE.flatMap((type) => {
    const effectif = comptes.find((c) => c.type === type)?.effectif ?? 0
    if (effectif === 0 && !saisissables.includes(type)) return []
    return [{ type, libelle: LIBELLES_TYPE_ABSENCE[type], effectif }]
  })
}
