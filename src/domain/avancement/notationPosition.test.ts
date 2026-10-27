import { describe, expect, it } from 'vitest'
import { notationClasseEchelon } from './notationPosition'

describe('notationClasseEchelon', () => {
  it('écrit la classe et l’échelon : « 2C/6E »', () => {
    expect(notationClasseEchelon({ classe: 2, echelon: 6 })).toBe('2C/6E')
    expect(notationClasseEchelon({ classe: 1, echelon: 1 })).toBe('1C/1E')
  })

  it('n’écrit que l’échelon quand il n’y a pas de classe (Assistants) : « 1E »', () => {
    expect(notationClasseEchelon({ classe: null, echelon: 1 })).toBe('1E')
    expect(notationClasseEchelon({ classe: null, echelon: 3 })).toBe('3E')
  })

  it('ne renvoie rien sans échelon numéroté (Délégué, Stagiaire, Classe Exceptionnelle…)', () => {
    expect(notationClasseEchelon({ classe: null, echelon: null })).toBeNull()
  })
})
