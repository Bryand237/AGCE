import { afterEach, describe, expect, it } from 'vitest'
import { dureeEnJours, nombreDeJoursRestants } from './duree'

const TZ_INITIAL = process.env.TZ

afterEach(() => {
  if (TZ_INITIAL === undefined) delete process.env.TZ
  else process.env.TZ = TZ_INITIAL
})

const jour = (iso: string) => new Date(`${iso}T00:00:00Z`)

describe('dureeEnJours', () => {
  it('compte les deux bornes', () => {
    expect(dureeEnJours(jour('2026-08-01'), jour('2026-08-10'))).toBe(10)
  })

  it('un congé d’un seul jour dure 1 jour', () => {
    expect(dureeEnJours(jour('2026-08-01'), jour('2026-08-01'))).toBe(1)
  })

  it('ne descend jamais sous 1 jour, même avec une fin avant le début', () => {
    expect(dureeEnJours(jour('2026-08-10'), jour('2026-08-01'))).toBe(1)
  })

  it('compte 98 jours du 1er mars au 6 juin (14 semaines)', () => {
    expect(dureeEnJours(jour('2026-03-01'), jour('2026-06-06'))).toBe(98)
  })
})

describe('nombreDeJoursRestants', () => {
  it('compte les jours jusqu’à la fin', () => {
    expect(nombreDeJoursRestants(jour('2026-11-10'), jour('2026-11-03'))).toBe(7)
  })

  it('vaut 1 la veille de la fin, 0 le jour de la fin', () => {
    expect(nombreDeJoursRestants(jour('2026-11-10'), jour('2026-11-09'))).toBe(1)
    expect(nombreDeJoursRestants(jour('2026-11-10'), jour('2026-11-10'))).toBe(0)
  })

  it('vaut 0 quand la fin est passée', () => {
    expect(nombreDeJoursRestants(jour('2026-11-10'), jour('2026-12-01'))).toBe(0)
  })

  it('ignore l’heure portée par les dates', () => {
    expect(
      nombreDeJoursRestants(new Date('2026-11-10T23:30:00Z'), new Date('2026-11-03T05:00:00Z'))
    ).toBe(7)
  })

  it.each(['America/New_York', 'Pacific/Kiritimati', 'Africa/Douala', 'UTC'])(
    'donne le même compte sous le fuseau %s',
    (fuseau) => {
      process.env.TZ = fuseau
      expect(nombreDeJoursRestants(jour('2026-11-10'), jour('2026-11-03'))).toBe(7)
    }
  )
})
