import { describe, expect, it } from 'vitest'
import { formaterClasseEchelonIndice } from './formaterClasseEchelonIndice'

describe('formaterClasseEchelonIndice', () => {
  it('formate classe/échelon/indice depuis la ligne de grille', () => {
    expect(
      formaterClasseEchelonIndice({
        grade: 'CHARGE_DE_COURS',
        classe: 2,
        echelon: 4,
        indice: 940,
        sousCategorie: null,
      })
    ).toBe('2C/4E/940')
  })

  it('formate un Assistant (échelon sans classe) : « 1E/465 », jamais « —/465 »', () => {
    const assistant = (echelon: number, indice: number) => ({
      grade: 'ASSISTANT' as const,
      classe: null,
      echelon,
      indice,
      sousCategorie: null,
    })
    expect(formaterClasseEchelonIndice(assistant(1, 465))).toBe('1E/465')
    expect(formaterClasseEchelonIndice(assistant(2, 665))).toBe('2E/665')
  })

  it('formate les paliers sans classe/échelon numérotés', () => {
    expect(
      formaterClasseEchelonIndice({
        grade: 'CHARGE_DE_COURS',
        classe: null,
        echelon: null,
        indice: 665,
        sousCategorie: 'STAGIAIRE',
      })
    ).toBe('Stagiaire/665')
  })
})
