import { describe, it, expect } from 'vitest'
import { estEligibleAvancement, proposerCandidats, type CandidatAvancement } from './eligibilite'
import type { PalierIndiciaire } from './calculerProchainEchelon'

describe('estEligibleAvancement', () => {
  it('est éligible si la durée est atteinte à la fin de la période', () => {
    const dateEffet = new Date('2024-01-01')
    const finPeriode = new Date('2026-06-30')
    expect(estEligibleAvancement(dateEffet, finPeriode)).toBe(true)
  })

  it("n'est pas éligible si la durée n'est pas encore atteinte", () => {
    const dateEffet = new Date('2025-06-01')
    const finPeriode = new Date('2026-06-30')
    expect(estEligibleAvancement(dateEffet, finPeriode)).toBe(false)
  })
})

describe('proposerCandidats', () => {
  const grille: PalierIndiciaire[] = [
    { id: 'p1', grade: 'CHARGE_DE_COURS', voie: null, sousCategorie: null, classe: 2, echelon: 2, indice: 785, ordre: 3 },
    { id: 'p2', grade: 'CHARGE_DE_COURS', voie: null, sousCategorie: null, classe: 2, echelon: 3, indice: 870, ordre: 4 },
    { id: 'p3', grade: 'PROFESSEUR', voie: null, sousCategorie: 'HORS_ECHELLE', classe: null, echelon: null, indice: 1400, ordre: 10 },
  ]

  it('propose un candidat éligible avec le bon id de position', () => {
    const candidats: CandidatAvancement[] = [
      { enseignantId: 'e1', grade: 'CHARGE_DE_COURS', ordreActuel: 3, dateEffetEchelon: new Date('2024-01-01') },
    ]
    const propositions = proposerCandidats(candidats, new Date('2026-06-30'), grille)
    expect(propositions).toEqual([{ enseignantId: 'e1', positionProposeeId: 'p2' }])
  })

  it("exclut un candidat pas encore éligible", () => {
    const candidats: CandidatAvancement[] = [
      { enseignantId: 'e2', grade: 'CHARGE_DE_COURS', ordreActuel: 3, dateEffetEchelon: new Date('2025-06-01') },
    ]
    expect(proposerCandidats(candidats, new Date('2026-06-30'), grille)).toEqual([])
  })

  it('exclut un candidat éligible par la durée mais en fin de grille', () => {
    const candidats: CandidatAvancement[] = [
      { enseignantId: 'e3', grade: 'PROFESSEUR', ordreActuel: 10, dateEffetEchelon: new Date('2020-01-01') },
    ]
    expect(proposerCandidats(candidats, new Date('2026-06-30'), grille)).toEqual([])
  })
})