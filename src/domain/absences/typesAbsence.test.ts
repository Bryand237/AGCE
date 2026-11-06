import { describe, expect, it } from 'vitest'
import { TYPES_ABSENCE } from '../enseignants/dossier'
import { effectifsParType } from './effectifsParType'
import { LIBELLES_TYPE_ABSENCE } from './etatAbsence'
import { TYPES_ABSENCE_SAISISSABLES } from './typesAbsence'

describe('types d’absence', () => {
  it('chaque type de la base a un libellé, et un seul endroit les écrit', () => {
    expect(Object.keys(LIBELLES_TYPE_ABSENCE).sort()).toEqual([...TYPES_ABSENCE].sort())
  })

  it('les types qu’on saisit sont des types de la base', () => {
    for (const type of TYPES_ABSENCE_SAISISSABLES) expect(TYPES_ABSENCE).toContain(type)
  })
})

describe('effectifsParType', () => {
  it('montre toujours les types saisissables, à zéro quand il n’y en a pas', () => {
    expect(effectifsParType([])).toEqual([
      { type: 'MISSION', libelle: 'Mission', effectif: 0 },
      { type: 'CONGE_MATERNITE', libelle: 'Congé de maternité', effectif: 0 },
      { type: 'CONGE_MALADIE', libelle: 'Congé de maladie', effectif: 0 },
    ])
  })

  it('compte chaque type', () => {
    const effectifs = effectifsParType([
      { type: 'MISSION', effectif: 4 },
      { type: 'CONGE_MALADIE', effectif: 2 },
    ])
    expect(effectifs.map((e) => e.effectif)).toEqual([4, 0, 2])
  })

  it('ajoute « congé administratif » et « autre » dès qu’une absence de ce type existe', () => {
    const effectifs = effectifsParType([
      { type: 'CONGE_ADMINISTRATIF', effectif: 1 },
      { type: 'AUTRE', effectif: 3 },
    ])
    expect(effectifs.map((e) => [e.libelle, e.effectif])).toEqual([
      ['Mission', 0],
      ['Congé de maternité', 0],
      ['Congé de maladie', 0],
      ['Congé administratif', 1],
      ['Autre', 3],
    ])
  })

  it('le total du graphique est le total des absences, tous types confondus', () => {
    const comptes = [
      { type: 'MISSION', effectif: 2 },
      { type: 'CONGE_ADMINISTRATIF', effectif: 5 },
      { type: 'AUTRE', effectif: 1 },
    ] as const
    const total = effectifsParType(comptes).reduce((somme, e) => somme + e.effectif, 0)
    expect(total).toBe(8)
  })
})
