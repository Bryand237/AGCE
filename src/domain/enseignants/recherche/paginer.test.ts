import { describe, expect, it } from 'vitest'
import { paginer } from './paginer'

const vingtCinq = Array.from({ length: 25 }, (_, i) => i + 1)

describe('paginer', () => {
  it('découpe en pages de la taille demandée', () => {
    expect(paginer(vingtCinq, 1, 10).elements).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(paginer(vingtCinq, 3, 10).elements).toEqual([21, 22, 23, 24, 25])
  })

  it('annonce le total et le nombre de pages', () => {
    const page = paginer(vingtCinq, 1, 10)
    expect(page.total).toBe(25)
    expect(page.totalPages).toBe(3)
  })

  it('ramène une page trop grande à la dernière, jamais une page vide', () => {
    const page = paginer(vingtCinq, 99, 10)
    expect(page.page).toBe(3)
    expect(page.elements).toHaveLength(5)
  })

  it.each([0, -4, Number.NaN, 2.7])('ramène la page %s dans les limites', (demandee) => {
    const page = paginer(vingtCinq, demandee, 10)
    expect(page.page).toBeGreaterThanOrEqual(1)
    expect(page.page).toBeLessThanOrEqual(3)
    expect(page.elements.length).toBeGreaterThan(0)
  })

  it('une liste vide donne une seule page vide', () => {
    expect(paginer([], 1, 10)).toEqual({ elements: [], page: 1, totalPages: 1, total: 0 })
  })

  it('une page pleine exacte ne crée pas de page de trop', () => {
    expect(paginer(vingtCinq.slice(0, 20), 1, 10).totalPages).toBe(2)
  })
})
