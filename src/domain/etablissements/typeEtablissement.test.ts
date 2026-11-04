import { describe, expect, it } from 'vitest'
import { LIBELLES_TYPE_ETABLISSEMENT, TYPES_ETABLISSEMENT } from './typeEtablissement'

describe('types d’établissement', () => {
  it('chaque type a son libellé', () => {
    expect(TYPES_ETABLISSEMENT.map((type) => LIBELLES_TYPE_ETABLISSEMENT[type])).toEqual([
      'École',
      'Faculté',
    ])
  })

  it('n’a pas de libellé en trop', () => {
    expect(Object.keys(LIBELLES_TYPE_ETABLISSEMENT).sort()).toEqual([...TYPES_ETABLISSEMENT].sort())
  })
})
