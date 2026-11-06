import { afterEach, describe, expect, it } from 'vitest'
import { ancienneteEnAnnees } from './anciennete'

const TZ_INITIAL = process.env.TZ

afterEach(() => {
  if (TZ_INITIAL === undefined) delete process.env.TZ
  else process.env.TZ = TZ_INITIAL
})

const jour = (iso: string) => new Date(`${iso}T00:00:00Z`)

describe('ancienneteEnAnnees', () => {
  it('compte les années accomplies', () => {
    expect(ancienneteEnAnnees(jour('2010-09-01'), jour('2026-11-03'))).toBe(16)
  })

  it('une année est accomplie le jour anniversaire, pas la veille', () => {
    expect(ancienneteEnAnnees(jour('2010-11-03'), jour('2026-11-02'))).toBe(15)
    expect(ancienneteEnAnnees(jour('2010-11-03'), jour('2026-11-03'))).toBe(16)
  })

  it('tient compte du mois quand le jour est plus petit', () => {
    expect(ancienneteEnAnnees(jour('2010-12-20'), jour('2026-11-25'))).toBe(15)
  })

  it('vaut 0 la première année et pour une prise de service à venir', () => {
    expect(ancienneteEnAnnees(jour('2026-05-01'), jour('2026-11-03'))).toBe(0)
    expect(ancienneteEnAnnees(jour('2027-01-01'), jour('2026-11-03'))).toBe(0)
  })

  it('un 29 février a son anniversaire le 1er mars les années non bissextiles', () => {
    expect(ancienneteEnAnnees(jour('2016-02-29'), jour('2026-02-28'))).toBe(9)
    expect(ancienneteEnAnnees(jour('2016-02-29'), jour('2026-03-01'))).toBe(10)
  })

  // À New York, minuit UTC tombe la veille à 19 h ou 20 h : le 1er mars 2016 y devient le 29
  // février (année bissextile) et le 1er mars 2026 le 28 février. Avec les accesseurs locaux, la
  // dixième année n'était pas encore accomplie le 1er mars 2026.
  it.each(['America/New_York', 'Pacific/Kiritimati', 'Africa/Douala', 'UTC'])(
    'compte 10 ans le 1er mars 2026 pour une prise de service au 1er mars 2016, sous le fuseau %s',
    (fuseau) => {
      process.env.TZ = fuseau
      expect(ancienneteEnAnnees(jour('2016-03-01'), jour('2026-03-01'))).toBe(10)
      expect(ancienneteEnAnnees(jour('2016-03-01'), jour('2026-02-28'))).toBe(9)
    }
  )
})
