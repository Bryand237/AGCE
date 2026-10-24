import { aujourdhui } from '@/domain/dates/jourCivil'
import { selectionnerEdition, type DemandeEdition } from '@/domain/editions/editions'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'
import { chargerDossiers, chargerGrille } from '@/lib/enseignants/chargerDossiers'

export type EditionChargee = {
  /** Les enseignants de la liste, dans l'ordre d'impression à l'intérieur de chaque établissement. */
  lignes: LigneRecherche[]
  jour: Date
}

/**
 * Une liste officielle, complète : celle que la page « Éditions » compte et que les PDF et CSV
 * impriment. Un seul chargement, puis la même sélection pure que partout ailleurs.
 */
export async function chargerEdition(demande: DemandeEdition): Promise<EditionChargee> {
  const jour = aujourdhui()
  const [dossiers, grille] = await Promise.all([chargerDossiers(), chargerGrille()])
  return { lignes: selectionnerEdition(demande, dossiers, grille, jour), jour }
}
