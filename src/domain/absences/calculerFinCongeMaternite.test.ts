import { afterEach, describe, expect, it } from 'vitest'
import { calculerFinCongeMaternite } from './calculerFinCongeMaternite'

const TZ_INITIAL = process.env.TZ

afterEach(() => {
  if (TZ_INITIAL === undefined) delete process.env.TZ
  else process.env.TZ = TZ_INITIAL
})

const fin = (debut: string) => calculerFinCongeMaternite(new Date(debut)).toISOString()

describe('calculerFinCongeMaternite', () => {
  it('ajoute 14 semaines (98 jours)', () => {
    expect(fin('2026-04-14T00:00:00Z')).toBe('2026-07-21T00:00:00.000Z')
  })

  it('passe d’une année à l’autre', () => {
    expect(fin('2026-11-20T00:00:00Z')).toBe('2027-02-26T00:00:00.000Z')
  })

  it('ne modifie pas la date reçue', () => {
    const debut = new Date('2026-04-14T00:00:00Z')
    calculerFinCongeMaternite(debut)
    expect(debut.toISOString()).toBe('2026-04-14T00:00:00.000Z')
  })

  // À New York, le congé du 1er mars 2026 (heure d'hiver) se termine en heure d'été : avec les
  // accesseurs locaux, la fin tombait le 6 juin à 23 h UTC au lieu du 7 juin à minuit.
  it.each(['America/New_York', 'Europe/Paris', 'Pacific/Kiritimati', 'Africa/Douala', 'UTC'])(
    'donne le même jour, à minuit UTC, sous le fuseau %s',
    (fuseau) => {
      process.env.TZ = fuseau
      expect(fin('2026-03-01T00:00:00Z')).toBe('2026-06-07T00:00:00.000Z')
    }
  )
})
