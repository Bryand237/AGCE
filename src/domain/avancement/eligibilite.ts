import { ajouterAnnees } from '../dates/jourCivil'
import { calculerProchainEchelon } from './calculerProchainEchelon'
import type { PalierIndiciaire } from './calculerProchainEchelon'

// ⚠️ Règle provisoire — durée fixe de 2 ans, à confirmer avec les textes
// réglementaires exacts. Si la vraie règle distingue ancienneté / choix /
// grand choix (l'enum TypeAvancement existe déjà dans le schéma pour ça),
// seul le calcul interne devra changer — pas la forme de la fonction.
export const DUREE_AVANCEMENT_ANNEES = 2

/** Date à laquelle un enseignant devient éligible à l'échelon suivant (calcul en UTC). */
export function dateEligibiliteAvancement(dateEffetEchelon: Date): Date {
  return ajouterAnnees(dateEffetEchelon, DUREE_AVANCEMENT_ANNEES)
}

export function estEligibleAvancement(dateEffetEchelon: Date, finPeriode: Date): boolean {
  return dateEligibiliteAvancement(dateEffetEchelon) <= finPeriode
}

export type CandidatAvancement = {
  enseignantId: string
  grade: string
  ordreActuel: number
  dateEffetEchelon: Date
}

/**
 * Un candidat en fin de grille (calculerProchainEchelon renvoie null) est
 * exclu même s'il est éligible par la durée : c'est un changement de
 * classe ou de grade, pas un avancement d'échelon normal — jamais inclus
 * silencieusement ici.
 */
export function proposerCandidats(
  candidats: CandidatAvancement[],
  finPeriode: Date,
  grille: PalierIndiciaire[]
) {
  const resultat: { enseignantId: string; positionProposeeId: string }[] = []
  for (const c of candidats) {
    if (!estEligibleAvancement(c.dateEffetEchelon, finPeriode)) continue
    const suivant = calculerProchainEchelon(grille, c.grade, c.ordreActuel)
    if (suivant) resultat.push({ enseignantId: c.enseignantId, positionProposeeId: suivant.id })
  }
  return resultat
}