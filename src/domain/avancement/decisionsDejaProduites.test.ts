import { describe, expect, it } from 'vitest'
import { notesDecisionsDejaProduites } from './decisionsDejaProduites'

describe('notesDecisionsDejaProduites', () => {
  it('ne dit rien quand aucune décision n’a été produite', () => {
    expect(notesDecisionsDejaProduites({ enAttente: 0, signees: 0 })).toEqual([])
  })

  it('invite à régénérer un brouillon, au singulier', () => {
    expect(notesDecisionsDejaProduites({ enAttente: 1, signees: 0 })).toEqual([
      '1 brouillon de décision a déjà été généré : régénérez-le pour qu’il reprenne ces valeurs.',
    ])
  })

  it('invite à régénérer les brouillons, au pluriel', () => {
    expect(notesDecisionsDejaProduites({ enAttente: 3, signees: 0 })).toEqual([
      '3 brouillons de décision ont déjà été générés : régénérez-les pour qu’ils reprennent ces valeurs.',
    ])
  })

  it('précise qu’une décision signée n’est pas modifiée', () => {
    expect(notesDecisionsDejaProduites({ enAttente: 0, signees: 1 })).toEqual([
      '1 décision est déjà signée : son document garde les valeurs d’origine.',
    ])
    expect(notesDecisionsDejaProduites({ enAttente: 0, signees: 4 })).toEqual([
      '4 décisions sont déjà signées : leurs documents gardent les valeurs d’origine.',
    ])
  })

  it('donne les deux notes quand il y a des brouillons et des décisions signées', () => {
    const notes = notesDecisionsDejaProduites({ enAttente: 2, signees: 5 })

    expect(notes).toHaveLength(2)
    expect(notes[0]).toMatch(/brouillons/)
    expect(notes[1]).toMatch(/signées/)
  })
})
