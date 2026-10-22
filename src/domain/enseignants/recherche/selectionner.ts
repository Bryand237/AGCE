import type { PalierIndiciaire } from '../../avancement/calculerProchainEchelon'
import type { DossierEnseignant } from '../dossier'
import { calculerSituation } from '../situation'
import { correspondAuxFiltres } from './correspond'
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
 */
export function selectionnerDossiers(
  dossiers: readonly DossierEnseignant[],
  filtres: FiltresEnseignants,
  grille: PalierIndiciaire[]
): LigneRecherche[] {
  const retenues = avecSituation(dossiers, grille).filter((ligne) =>
    correspondAuxFiltres(ligne.dossier, filtres)
  )
  return trierLignes(retenues, filtres.tri, filtres.ordre)
}
