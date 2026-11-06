import { describe, expect, it } from 'vitest'
import { erreurPositionProposee, positionsProposables } from './positionProposee'

const position = (grade: string, voie: string | null, ordre: number) => ({
  grade,
  voie,
  ordre,
})

describe('erreurPositionProposee', () => {
  const depart = position('CHARGE_DE_COURS', 'AUCUNE', 3)

  it('accepte le palier suivant du même grade et de la même voie', () => {
    expect(erreurPositionProposee(depart, position('CHARGE_DE_COURS', 'AUCUNE', 4))).toBeUndefined()
  })

  it('accepte de franchir plusieurs paliers d’un coup', () => {
    expect(erreurPositionProposee(depart, position('CHARGE_DE_COURS', 'AUCUNE', 9))).toBeUndefined()
  })

  it('refuse un autre grade (Assistant proposé vers Professeur) en nommant le grade actuel', () => {
    const message = erreurPositionProposee(
      position('ASSISTANT', 'SANS_THESE', 2),
      position('PROFESSEUR', 'AUCUNE', 5)
    )
    expect(message).toMatch(/doit rester dans le grade de l'enseignant \(Assistant\)/)
  })

  it('refuse un autre grade même si son ordre est supérieur', () => {
    expect(
      erreurPositionProposee(depart, position('MAITRE_DE_CONFERENCES', 'AUCUNE', 99))
    ).toBeDefined()
  })

  it('refuse une autre voie du même grade', () => {
    const message = erreurPositionProposee(
      position('ASSISTANT', 'SANS_THESE', 2),
      position('ASSISTANT', 'AVEC_THESE', 5)
    )
    expect(message).toMatch(/même voie/)
  })

  it('refuse la position de départ elle-même (un avancement « de X vers X »)', () => {
    expect(erreurPositionProposee(depart, position('CHARGE_DE_COURS', 'AUCUNE', 3))).toMatch(
      /supérieure/
    )
  })

  it('refuse un palier inférieur', () => {
    expect(erreurPositionProposee(depart, position('CHARGE_DE_COURS', 'AUCUNE', 1))).toMatch(
      /supérieure/
    )
  })

  it('annonce le grade avant la voie, et la voie avant l’ordre', () => {
    // Autre grade ET autre voie ET ordre inférieur : c'est le grade qui est signalé.
    expect(
      erreurPositionProposee(
        position('ASSISTANT', 'SANS_THESE', 5),
        position('PROFESSEUR', 'AUCUNE', 1)
      )
    ).toMatch(/grade/)
  })
})

describe('positionsProposables', () => {
  const grille = [
    { id: 'a1', ...position('ASSISTANT', 'SANS_THESE', 1) },
    { id: 'a2', ...position('ASSISTANT', 'SANS_THESE', 2) },
    { id: 'a3', ...position('ASSISTANT', 'SANS_THESE', 3) },
    { id: 't1', ...position('ASSISTANT', 'AVEC_THESE', 4) },
    { id: 'c1', ...position('CHARGE_DE_COURS', 'AUCUNE', 5) },
  ]

  it('ne garde que les positions supérieures du même grade et de la même voie, dans l’ordre', () => {
    const resultat = positionsProposables([...grille].reverse(), grille[0]!)
    expect(resultat.map((p) => p.id)).toEqual(['a2', 'a3'])
  })

  it('renvoie une liste vide en fin de grille', () => {
    expect(positionsProposables(grille, grille[2]!)).toEqual([])
  })

  it('ne modifie pas la grille reçue', () => {
    const copie = [...grille].reverse()
    positionsProposables(copie, grille[0]!)
    expect(copie.map((p) => p.id)).toEqual(['c1', 't1', 'a3', 'a2', 'a1'])
  })
})
