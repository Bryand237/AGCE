import { describe, expect, it } from 'vitest'
import { valeurChampDate } from './valeurChampDate'

describe('valeurChampDate', () => {
  it('écrit la date en AAAA-MM-JJ', () => {
    expect(valeurChampDate(new Date('1990-01-01T00:00:00Z'))).toBe('1990-01-01')
  })

  it('lit en UTC : un minuit UTC reste le même jour, à l’ouest de Greenwich comme à l’est', () => {
    expect(valeurChampDate(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01')
    expect(valeurChampDate(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12-31')
  })

  it('accepte le texte d’une date', () => {
    expect(valeurChampDate('2026-04-14')).toBe('2026-04-14')
    expect(valeurChampDate('2026-04-14T00:00:00.000Z')).toBe('2026-04-14')
  })

  it.each<[string, Date | string | null | undefined]>([
    ['null', null],
    ['undefined', undefined],
    ['une chaîne vide', ''],
    ['un texte qui n’est pas une date', 'pas une date'],
    ['une date invalide', new Date('x')],
  ])('donne un champ vide pour %s', (_cas, valeur) => {
    expect(valeurChampDate(valeur)).toBe('')
  })
})
