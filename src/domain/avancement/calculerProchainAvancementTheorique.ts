import { calculerProchainEchelon } from './calculerProchainEchelon'
import type { PalierIndiciaire } from './calculerProchainEchelon'
import { dateEligibiliteAvancement } from './eligibilite'

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
  const dateEligibilite = dateEligibiliteAvancement(dateEffetEchelon)
  return { dateEligibilite, positionSuivante: calculerProchainEchelon(grille, grade, ordreActuel) }
}
