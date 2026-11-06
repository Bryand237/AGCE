import { describe, expect, it } from 'vitest'
import { semestrePrecedent } from './semestrePrecedent'
import { aujourdhui } from '../dates/jourCivil'

const jour = (iso: string) => new Date(`${iso}T00:00:00Z`)

describe('semestrePrecedent', () => {
  it.each([
    ['2026-01-01', '2025-07-01', '2025-12-31'],
    ['2026-03-15', '2025-07-01', '2025-12-31'],
    ['2026-06-30', '2025-07-01', '2025-12-31'],
    ['2026-07-01', '2026-01-01', '2026-06-30'],
    ['2026-11-03', '2026-01-01', '2026-06-30'],
    ['2026-12-31', '2026-01-01', '2026-06-30'],
  ])('le %s propose du %s au %s', (aujourdHui, debut, fin) => {
    expect(semestrePrecedent(jour(aujourdHui))).toEqual({ debut, fin })
  })

  it('suit le jour du calendrier local : le 1er juillet à 0 h 30 heure locale est déjà juillet', () => {
    // Construit avec les accesseurs locaux : le test ne dépend pas du fuseau de la machine.
    const premierJuillet = aujourdhui(new Date(2026, 6, 1, 0, 30, 0))
    expect(semestrePrecedent(premierJuillet)).toEqual({ debut: '2026-01-01', fin: '2026-06-30' })
    const trenteJuin = aujourdhui(new Date(2026, 5, 30, 23, 30, 0))
    expect(semestrePrecedent(trenteJuin)).toEqual({ debut: '2025-07-01', fin: '2025-12-31' })
  })
})
