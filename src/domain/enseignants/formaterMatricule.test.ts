import { describe, expect, it } from 'vitest'
import { formaterMatricule } from './formaterMatricule'

describe('formaterMatricule', () => {
  it('sépare les quatre premiers chiffres du reste', () => {
    expect(formaterMatricule('0652125K')).toBe('0652 125K')
    expect(formaterMatricule('1134259T')).toBe('1134 259T')
  })

  it('ne change pas un matricule déjà espacé', () => {
    expect(formaterMatricule('0652 125K')).toBe('0652 125K')
  })

  it('met l’espace au bon endroit même si la saisie en avait ailleurs', () => {
    expect(formaterMatricule('06 52125K')).toBe('0652 125K')
  })

  it('laisse intact un matricule d’une autre forme', () => {
    expect(formaterMatricule('A12345')).toBe('A12345')
    expect(formaterMatricule('  652125K ')).toBe('652125K')
  })
})
