import { describe, expect, it } from 'vitest'
import { descriptionSelection, nomFichierSelection } from './descriptionSelection'

const JOUR = new Date('2026-10-23T00:00:00Z')

describe('descriptionSelection', () => {
  it('sans critère : tous les enseignants, avec la date', () => {
    expect(descriptionSelection([], JOUR)).toBe('Tous les enseignants — au 23/10/2026')
  })

  it('énumère les critères des puces, séparés par des points-virgules', () => {
    const puces = [
      { libelle: 'Statut : Actif', parametres: ['statut'] },
      { libelle: 'Date de retraite : déjà passée', parametres: ['retraiteEcheance'] },
    ]
    expect(descriptionSelection(puces, JOUR)).toBe(
      'Sélection au 23/10/2026 — Statut : Actif ; Date de retraite : déjà passée'
    )
  })
})

describe('nomFichierSelection', () => {
  it('porte le jour d’édition et l’extension', () => {
    expect(nomFichierSelection(JOUR, 'pdf')).toBe('selection-enseignants-2026-10-23.pdf')
    expect(nomFichierSelection(JOUR, 'csv')).toBe('selection-enseignants-2026-10-23.csv')
  })
})
