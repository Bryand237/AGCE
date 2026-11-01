import { describe, expect, it } from 'vitest'
import { bornerPage, lirePage } from './pagination'

describe('lirePage', () => {
  it('lit un numéro de page valide', () => {
    expect(lirePage('1')).toBe(1)
    expect(lirePage('7')).toBe(7)
    expect(lirePage('120')).toBe(120)
  })

  it('tolère les espaces autour', () => {
    expect(lirePage(' 3 ')).toBe(3)
  })

  it.each([
    ['absent', undefined],
    ['vide', ''],
    ['des espaces', '   '],
    ['du texte', 'abc'],
    ['zéro', '0'],
    ['un négatif', '-3'],
    ['un décimal', '2.5'],
    ['une notation scientifique', '1e3'],
    ['un signe plus', '+4'],
    ['du texte collé au nombre', '3abc'],
    ['un nombre démesuré', '99999999999'],
    ['un nombre au-delà du maximum', '1000001'],
    ['Infinity', 'Infinity'],
    ['NaN', 'NaN'],
  ])('ramène %s à la page 1', (_cas, valeur) => {
    expect(lirePage(valeur)).toBe(1)
  })

  it('lit la première valeur d’un paramètre répété', () => {
    expect(lirePage(['4', '9'])).toBe(4)
    expect(lirePage(['abc', '9'])).toBe(1)
    expect(lirePage([])).toBe(1)
  })
})

describe('bornerPage', () => {
  it('calcule skip et take de la page demandée', () => {
    expect(bornerPage(2, 45, 20)).toEqual({ page: 2, totalPages: 3, skip: 20, take: 20 })
  })

  it('ramène une page trop grande à la dernière', () => {
    expect(bornerPage(999, 45, 20)).toEqual({ page: 3, totalPages: 3, skip: 40, take: 20 })
  })

  it('ramène une page nulle, négative, fractionnaire ou NaN dans les limites', () => {
    expect(bornerPage(0, 45, 20).page).toBe(1)
    expect(bornerPage(-3, 45, 20).page).toBe(1)
    expect(bornerPage(2.7, 45, 20).page).toBe(2)
    expect(bornerPage(Number.NaN, 45, 20).page).toBe(1)
  })

  it('garde une page, avec skip à 0, quand la liste est vide', () => {
    expect(bornerPage(5, 0, 20)).toEqual({ page: 1, totalPages: 1, skip: 0, take: 20 })
  })

  it('compte une page pleine sans page vide derrière', () => {
    expect(bornerPage(1, 40, 20).totalPages).toBe(2)
    expect(bornerPage(1, 41, 20).totalPages).toBe(3)
  })

  it('utilise la taille de page de l’application par défaut', () => {
    expect(bornerPage(1, 100).take).toBe(20)
  })

  it('ne saute jamais une valeur négative ou fractionnaire à Prisma', () => {
    for (const demandee of [-10, -1, 0, 0.4, 1.9, 3, 1_000_000, Number.NaN]) {
      for (const total of [0, 1, 19, 20, 21, 400]) {
        const { skip, take } = bornerPage(demandee, total, 20)
        expect(Number.isInteger(skip) && skip >= 0).toBe(true)
        expect(take).toBe(20)
      }
    }
  })
})
