import { describe, expect, it } from 'vitest'
import { motifSelectionPerimee, separerSelections } from './selectionsAValider'

const position = (grade: string, voie: string, ordre: number) => ({ grade, voie, ordre })

function selection(surcharge: Record<string, unknown> = {}) {
  return {
    statutEnseignant: 'ACTIF',
    positionActuelle: position('ASSISTANT', 'SANS_THESE', 2),
    positionProposee: position('ASSISTANT', 'SANS_THESE', 3),
    ...surcharge,
  }
}

describe('motifSelectionPerimee', () => {
  it('laisse passer un enseignant actif dont la proposition suit sa position', () => {
    expect(motifSelectionPerimee(selection())).toBeUndefined()
  })

  it('accepte une proposition qui franchit plusieurs paliers', () => {
    expect(
      motifSelectionPerimee(selection({ positionProposee: position('ASSISTANT', 'SANS_THESE', 7) }))
    ).toBeUndefined()
  })

  it.each([
    ['RETRAITE', /retraité/],
    ['TRANSFERE', /transféré/],
  ])('signale un enseignant « %s »', (statutEnseignant, attendu) => {
    expect(motifSelectionPerimee(selection({ statutEnseignant }))).toMatch(attendu)
  })

  it('signale un statut inconnu au lieu de le laisser passer', () => {
    expect(motifSelectionPerimee(selection({ statutEnseignant: 'SUSPENDU' }))).toMatch(/suspendu/)
  })

  it('signale une proposition égale à la position actuelle (second rapport validé pour la même période)', () => {
    expect(
      motifSelectionPerimee(selection({ positionProposee: position('ASSISTANT', 'SANS_THESE', 2) }))
    ).toMatch(/position a changé/)
  })

  it('signale une proposition devenue inférieure à la position actuelle', () => {
    expect(
      motifSelectionPerimee(selection({ positionActuelle: position('ASSISTANT', 'SANS_THESE', 5) }))
    ).toMatch(/position a changé/)
  })

  it('signale une fiche corrigée vers un autre grade', () => {
    expect(
      motifSelectionPerimee(
        selection({ positionActuelle: position('CHARGE_DE_COURS', 'AUCUNE', 1) })
      )
    ).toMatch(/position a changé/)
  })

  it('annonce le statut avant la position', () => {
    expect(
      motifSelectionPerimee(
        selection({
          statutEnseignant: 'RETRAITE',
          positionProposee: position('ASSISTANT', 'SANS_THESE', 1),
        })
      )
    ).toMatch(/retraité/)
  })
})

describe('separerSelections', () => {
  it('sépare les sélections applicables des sélections périmées, avec leur motif', () => {
    const bonne = { id: 's1', ...selection() }
    const retraite = { id: 's2', ...selection({ statutEnseignant: 'RETRAITE' }) }
    const doublon = {
      id: 's3',
      ...selection({ positionProposee: position('ASSISTANT', 'SANS_THESE', 2) }),
    }

    const { valides, perimees } = separerSelections([bonne, retraite, doublon])

    expect(valides.map((s) => s.id)).toEqual(['s1'])
    expect(perimees.map((p) => p.id)).toEqual(['s2', 's3'])
    expect(perimees[0]?.motif).toMatch(/retraité/)
  })

  it('renvoie deux listes vides pour une liste vide', () => {
    expect(separerSelections([])).toEqual({ valides: [], perimees: [] })
  })
})
