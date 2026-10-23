import { aujourdhui } from '@/domain/dates/jourCivil'
import type { FiltresEnseignants } from '@/domain/enseignants/recherche/filtres'
import { decrirePuces } from '@/domain/enseignants/recherche/puces'
import type { Puce } from '@/domain/enseignants/recherche/puces'
import { selectionnerDossiers } from '@/domain/enseignants/recherche/selectionner'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'
import { chargerDossiers, chargerGrille, chargerReferentielsFiltres } from './chargerDossiers'

export type SelectionChargee = {
  /** Tous les enseignants retenus (la page demandée n'y change rien), dans l'ordre demandé. */
  lignes: LigneRecherche[]
  puces: Puce[]
  jour: Date
}

/**
 * La sélection d'un jeu de filtres, complète : celle que les exports PDF et CSV impriment. Elle
 * passe par selectionnerDossiers(), comme l'écran : ce qu'on exporte est exactement ce qu'on voit.
 */
export async function chargerSelection(filtres: FiltresEnseignants): Promise<SelectionChargee> {
  const jour = aujourdhui()
  const [dossiers, grille, referentiels] = await Promise.all([
    chargerDossiers(),
    chargerGrille(),
    chargerReferentielsFiltres(),
  ])
  return {
    lignes: selectionnerDossiers(dossiers, filtres, grille, jour),
    puces: decrirePuces(filtres, referentiels),
    jour,
  }
}
