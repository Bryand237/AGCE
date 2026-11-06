import { describe, expect, it } from 'vitest'
import { erreurDateRetour } from './retourAbsence'

const DEBUT = new Date('2026-03-01')

describe('erreurDateRetour', () => {
  it('accepte un retour après le début', () => {
    expect(erreurDateRetour(DEBUT, new Date('2026-03-31'))).toBeUndefined()
  })

  it('accepte un retour le jour même du début', () => {
    expect(erreurDateRetour(DEBUT, new Date('2026-03-01'))).toBeUndefined()
  })

  it('refuse un retour antérieur au début, en citant la date de début', () => {
    expect(erreurDateRetour(DEBUT, new Date('2026-02-15'))).toBe(
      "La date de retour ne peut pas précéder le début de l'absence (le 01/03/2026)."
    )
  })
})
