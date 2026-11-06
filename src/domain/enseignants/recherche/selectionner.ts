import type { PalierIndiciaire } from '../../avancement/calculerProchainEchelon'
import type { DossierEnseignant } from '../dossier'
import { calculerSituation } from '../situation'
import { ligneCorrespond } from './correspond'
import type { FiltresEnseignants } from './filtres'
import { trierLignes } from './trier'
import type { LigneRecherche } from './trier'

/** Situation de carrière de chaque dossier (retraite, avancement), à partir de la grille. */
export function avecSituation(
  dossiers: readonly DossierEnseignant[],
  grille: PalierIndiciaire[]
): LigneRecherche[] {
  return dossiers.map((dossier) => ({
    dossier,
    situation: calculerSituation(
      {
        statut: dossier.statut,
        grade: dossier.grade,
        dateNaissance: dossier.dateNaissance,
        dateFinService: dossier.dateFinService,
        dateEffetEchelon: dossier.dateEffetEchelon,
        ordrePosition: dossier.position.ordre,
      },
      grille
    ),
  }))
}

/**
 * Tous les dossiers qui satisfont les filtres, dans l'ordre demandé (la pagination vient
 * après, ailleurs). L'écran, le PDF et le CSV partent tous de cette fonction.
 *
 * `jour` est le jour d'aujourd'hui (voir aujourdhui() dans dates/jourCivil) : les critères
 * « retraite passée / à venir » et « avancement passé / à venir » en dépendent. Il est passé
 * en argument, jamais lu ici, pour que le résultat ne dépende que de ce qu'on donne.
 */
export function selectionnerDossiers(
  dossiers: readonly DossierEnseignant[],
  filtres: FiltresEnseignants,
  grille: PalierIndiciaire[],
  jour: Date
): LigneRecherche[] {
  const retenues = avecSituation(dossiers, grille).filter((ligne) =>
    ligneCorrespond(ligne, filtres, jour)
  )
  return trierLignes(retenues, filtres.tri, filtres.ordre)
}
