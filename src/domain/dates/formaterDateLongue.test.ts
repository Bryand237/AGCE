import { describe, expect, it } from 'vitest'
import { formaterDateLongue } from './formaterDateLongue'

describe('formaterDateLongue', () => {
  it('écrit le jour, le mois en toutes lettres et l’année', () => {
    expect(formaterDateLongue(new Date('2026-04-14'))).toBe('14 avril 2026')
    expect(formaterDateLongue(new Date('2025-12-31'))).toBe('31 décembre 2025')
    expect(formaterDateLongue(new Date('2026-08-07'))).toBe('7 août 2026')
  })

  it('ne met pas de zéro devant les jours de 2 à 9', () => {
    expect(formaterDateLongue(new Date('2026-01-07'))).toBe('7 janvier 2026')
    expect(formaterDateLongue(new Date('2026-02-02'))).toBe('2 février 2026')
  })

  it('écrit « 1er » le premier du mois', () => {
    expect(formaterDateLongue(new Date('2026-01-01'))).toBe('1er janvier 2026')
    expect(formaterDateLongue(new Date('2023-07-01'))).toBe('1er juillet 2023')
    expect(formaterDateLongue(new Date('2025-08-01'))).toBe('1er août 2025')
  })

  it('lit la date en UTC : le jour reste le même quel que soit le fuseau du serveur', () => {
    expect(formaterDateLongue(new Date('2026-01-01T00:00:00Z'))).toBe('1er janvier 2026')
    expect(formaterDateLongue(new Date('2026-04-14T23:59:59Z'))).toBe('14 avril 2026')
    expect(formaterDateLongue(new Date('2026-04-14T00:00:00Z'))).toBe('14 avril 2026')
  })

  it('renvoie une chaîne vide quand la date manque ou est invalide', () => {
    expect(formaterDateLongue(null)).toBe('')
    expect(formaterDateLongue(undefined)).toBe('')
    expect(formaterDateLongue(new Date('pas une date'))).toBe('')
  })
})
