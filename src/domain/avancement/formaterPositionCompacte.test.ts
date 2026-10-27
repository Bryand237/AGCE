import { describe, expect, it } from 'vitest'
import { formaterPositionCompacte } from './formaterPositionCompacte'

describe('formaterPositionCompacte', () => {
  it('écrit « 2C/6E/1115 » pour une position avec classe et échelon', () => {
    expect(
      formaterPositionCompacte({
        grade: 'MAITRE_DE_CONFERENCES',
        sousCategorie: null,
        classe: 2,
        echelon: 6,
        indice: 1115,
      })
    ).toBe('2C/6E/1115')
  })

  it('écrit « 1E/465 » pour un Assistant : l’échelon et l’indice, pas de classe', () => {
    const assistant = (echelon: number, indice: number) => ({
      grade: 'ASSISTANT',
      sousCategorie: null,
      classe: null,
      echelon,
      indice,
    })
    expect(formaterPositionCompacte(assistant(1, 465))).toBe('1E/465')
    expect(formaterPositionCompacte(assistant(3, 715))).toBe('3E/715')
  })

  it('garde les abréviations des paliers sans échelon numéroté', () => {
    const palier = (sousCategorie: string) => ({
      grade: 'PROFESSEUR',
      sousCategorie,
      classe: null,
      echelon: null,
      indice: 1350,
    })
    expect(formaterPositionCompacte(palier('DELEGUE'))).toBe('Délégué')
    expect(formaterPositionCompacte(palier('STAGIAIRE'))).toBe('Stagiaire')
    expect(formaterPositionCompacte(palier('CLASSE_EXCEPTIONNELLE'))).toBe('Cl. Exc.')
    expect(formaterPositionCompacte(palier('HORS_ECHELLE'))).toBe('Hors Éch.')
  })
})
