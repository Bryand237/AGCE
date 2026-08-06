import { calculerProchainEchelon } from './calculerProchainEchelon'
import type { PalierIndiciaire } from './calculerProchainEchelon'

const DUREE_AVANCEMENT_ANNEES = 2 // même règle que dans eligibilite.ts — si ce
// fichier change un jour, garde celui-ci en cohérence

export type ProchainAvancementTheorique = {
  dateEligibilite: Date
  positionSuivante: PalierIndiciaire | null // null = palier maximal du grade atteint
}

export function calculerProchainAvancementTheorique(
  dateEffetEchelon: Date,
  grade: string,
  ordreActuel: number,
  grille: PalierIndiciaire[]
): ProchainAvancementTheorique {
  const dateEligibilite = new Date(dateEffetEchelon)
  dateEligibilite.setFullYear(dateEligibilite.getFullYear() + DUREE_AVANCEMENT_ANNEES)
  return { dateEligibilite, positionSuivante: calculerProchainEchelon(grille, grade, ordreActuel) }
}
