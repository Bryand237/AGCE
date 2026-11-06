import { describe, expect, it } from 'vitest'
import { formaterMoisAnnee } from './formaterMoisAnnee'

describe('formaterMoisAnnee', () => {
  it('écrit le mois en toutes lettres et l’année', () => {
    expect(formaterMoisAnnee(new Date('2025-07-01'))).toBe('juillet 2025')
    expect(formaterMoisAnnee(new Date('2025-12-31'))).toBe('décembre 2025')
    expect(formaterMoisAnnee(new Date('2026-02-15'))).toBe('février 2026')
  })

  it('lit la date en UTC : le premier jour du mois reste dans son mois', () => {
    expect(formaterMoisAnnee(new Date('2025-07-01T00:00:00Z'))).toBe('juillet 2025')
    expect(formaterMoisAnnee(new Date('2025-12-31T23:59:59Z'))).toBe('décembre 2025')
  })
})
