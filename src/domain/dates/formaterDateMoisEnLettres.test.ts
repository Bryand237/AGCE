import { afterEach, describe, expect, it } from 'vitest'
import { formaterDateMoisEnLettres } from './formaterDateMoisEnLettres'

const TZ_INITIAL = process.env.TZ

afterEach(() => {
  if (TZ_INITIAL === undefined) delete process.env.TZ
  else process.env.TZ = TZ_INITIAL
})

describe('formaterDateMoisEnLettres', () => {
  it('écrit le jour, le mois en lettres et l’année', () => {
    expect(formaterDateMoisEnLettres(new Date('2026-11-02T00:00:00Z'))).toBe('2 novembre 2026')
    expect(formaterDateMoisEnLettres(new Date('2026-02-28T00:00:00Z'))).toBe('28 février 2026')
  })

  it('n’écrit pas « 1er » : c’est le format des écrans, pas celui des actes', () => {
    expect(formaterDateMoisEnLettres(new Date('2027-01-01T00:00:00Z'))).toBe('1 janvier 2027')
  })

  it.each(['America/New_York', 'Pacific/Kiritimati', 'Africa/Douala', 'UTC'])(
    'donne le même jour sous le fuseau %s',
    (fuseau) => {
      process.env.TZ = fuseau
      expect(formaterDateMoisEnLettres(new Date('1990-01-01T00:00:00Z'))).toBe('1 janvier 1990')
    }
  )

  it.each<[string, Date | null | undefined]>([
    ['null', null],
    ['undefined', undefined],
    ['une date invalide', new Date('x')],
  ])('donne une chaîne vide pour %s', (_cas, valeur) => {
    expect(formaterDateMoisEnLettres(valeur)).toBe('')
  })
})
