import { describe, expect, it } from 'vitest'
import { apostropheTypographique, typographierValeurs } from './typographie'

describe('apostropheTypographique', () => {
  it('remplace l’apostrophe droite par l’apostrophe typographique', () => {
    expect(apostropheTypographique("Département d'Histoire")).toBe('Département d’Histoire')
    expect(apostropheTypographique("l'exercice de l'année")).toBe('l’exercice de l’année')
  })

  it('laisse intacts les textes sans apostrophe droite', () => {
    expect(apostropheTypographique('Faculté des Sciences')).toBe('Faculté des Sciences')
    expect(apostropheTypographique('BILO’O Brigitte')).toBe('BILO’O Brigitte')
    expect(apostropheTypographique('')).toBe('')
  })
})

describe('typographierValeurs', () => {
  it('traite les textes, sans toucher aux nombres ni aux clés', () => {
    expect(
      typographierValeurs({ nomDepartement: "Département d'Histoire", indice: 870, vide: '' })
    ).toEqual({ nomDepartement: 'Département d’Histoire', indice: 870, vide: '' })
  })
})
