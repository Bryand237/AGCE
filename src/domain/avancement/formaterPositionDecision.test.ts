import { describe, expect, it } from 'vitest'
import { formaterPositionDecision } from './formaterPositionDecision'

const position = (surcharge: Record<string, unknown>) => ({
  grade: 'CHARGE_DE_COURS',
  sousCategorie: null,
  classe: 2,
  echelon: 2,
  ...surcharge,
})

describe('formaterPositionDecision', () => {
  it('écrit « 2ème Classe 2ème Echelon » comme la décision originale', () => {
    expect(formaterPositionDecision(position({}))).toBe('2ème Classe 2ème Echelon')
    expect(formaterPositionDecision(position({ classe: 1, echelon: 1 }))).toBe(
      '1ère Classe 1er Echelon'
    )
    expect(formaterPositionDecision(position({ echelon: 3 }))).toBe('2ème Classe 3ème Echelon')
  })

  it('laisse les positions sans classe ni échelon comme dans l’application', () => {
    expect(formaterPositionDecision(position({ sousCategorie: 'DELEGUE' }))).toBe(
      'Chargé de Cours Délégué'
    )
    expect(formaterPositionDecision(position({ sousCategorie: 'HORS_ECHELLE' }))).toBe(
      'Hors Échelle'
    )
  })
})
