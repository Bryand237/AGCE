import { describe, expect, it } from 'vitest'
import {
  ABREVIATIONS_GRADE,
  abreviationGrade,
  abreviationRegion,
  nomRegionDepuisCode,
} from './abreviations'
import { LIBELLES_GRADE } from './grade'

describe('abreviationGrade', () => {
  it('abrège les quatre grades', () => {
    expect(abreviationGrade('PROFESSEUR')).toBe('PR')
    expect(abreviationGrade('MAITRE_DE_CONFERENCES')).toBe('MC')
    expect(abreviationGrade('CHARGE_DE_COURS')).toBe('CC')
    expect(abreviationGrade('ASSISTANT')).toBe('ASS')
  })

  it('couvre exactement les grades du référentiel', () => {
    expect(Object.keys(ABREVIATIONS_GRADE).sort()).toEqual(Object.keys(LIBELLES_GRADE).sort())
  })

  it('renvoie un grade inconnu tel quel', () => {
    expect(abreviationGrade('DOYEN')).toBe('DOYEN')
  })
})

describe('abreviationRegion', () => {
  it.each([
    ['Adamaoua', 'AD'],
    ['Centre', 'CE'],
    ['Est', 'ES'],
    ['Extrême-Nord', 'EN'],
    ['Littoral', 'LT'],
    ['Nord', 'NO'],
    ['Nord-Ouest', 'NW'],
    ['Ouest', 'OU'],
    ['Sud', 'SU'],
    ['Sud-Ouest', 'SW'],
  ])('abrège %s en %s', (nom, code) => {
    expect(abreviationRegion(nom)).toBe(code)
  })

  it('ignore la casse, les accents et les tirets', () => {
    expect(abreviationRegion('EXTREME NORD')).toBe('EN')
    expect(abreviationRegion('nord ouest')).toBe('NW')
    expect(abreviationRegion('  ouest ')).toBe('OU')
  })

  it('renvoie une région inconnue telle quelle', () => {
    expect(abreviationRegion('Atlantide')).toBe('Atlantide')
  })

  it('attribue un code différent à chaque région', () => {
    const codes = [
      'Adamaoua',
      'Centre',
      'Est',
      'Extrême-Nord',
      'Littoral',
      'Nord',
      'Nord-Ouest',
      'Ouest',
      'Sud',
      'Sud-Ouest',
    ].map(abreviationRegion)
    expect(new Set(codes).size).toBe(10)
  })
})

describe('nomRegionDepuisCode', () => {
  it('retrouve le nom d’une région depuis son code', () => {
    expect(nomRegionDepuisCode('OU')).toBe('Ouest')
    expect(nomRegionDepuisCode('XX')).toBeUndefined()
  })
})
