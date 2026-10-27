import { describe, expect, it } from 'vitest'
import { formaterPosition } from './formaterPosition'
import { formaterPositionCompacte } from './formaterPositionCompacte'
import { formaterClasseEchelonIndice } from './formaterClasseEchelonIndice'
import { formaterPositionDecision } from './formaterPositionDecision'
import { GRILLE_REELLE } from './grilleReelleDeTest'

const assistant = (echelon: number, indice = 465) => ({
  grade: 'ASSISTANT',
  sousCategorie: null,
  classe: null,
  echelon,
  indice,
})

describe('formaterPosition', () => {
  it('écrit la classe et l’échelon : « 2ème Classe, 6ème Échelon »', () => {
    expect(
      formaterPosition({ grade: 'CHARGE_DE_COURS', sousCategorie: null, classe: 2, echelon: 6 })
    ).toBe('2ème Classe, 6ème Échelon')
    expect(
      formaterPosition({ grade: 'PROFESSEUR', sousCategorie: null, classe: 1, echelon: 1 })
    ).toBe('1ère Classe, 1er Échelon')
  })

  it('écrit l’échelon seul pour un Assistant, qui n’a pas de classe', () => {
    expect(formaterPosition(assistant(1))).toBe('1er Échelon')
    expect(formaterPosition(assistant(2))).toBe('2ème Échelon')
    expect(formaterPosition(assistant(3))).toBe('3ème Échelon')
  })

  it('garde les libellés des paliers sans échelon numéroté', () => {
    const palier = (sousCategorie: string) => ({
      grade: 'CHARGE_DE_COURS',
      sousCategorie,
      classe: null,
      echelon: null,
    })
    expect(formaterPosition(palier('DELEGUE'))).toBe('Chargé de Cours Délégué')
    expect(formaterPosition(palier('STAGIAIRE'))).toBe('Chargé de Cours Stagiaire')
    expect(formaterPosition(palier('CLASSE_EXCEPTIONNELLE'))).toBe('Classe Exceptionnelle')
    expect(formaterPosition(palier('HORS_ECHELLE'))).toBe('Hors Échelle')
  })
})

describe('formats de position : aucun palier de la grille ne s’écrit « — »', () => {
  it('la grille compte 39 paliers', () => {
    expect(GRILLE_REELLE).toHaveLength(39)
  })

  it.each([
    ['long', formaterPosition],
    ['de décision', formaterPositionDecision],
    ['compact', formaterPositionCompacte],
    ['officiel', formaterClasseEchelonIndice],
  ])('format %s', (_nom, formater) => {
    const format = formater as (palier: (typeof GRILLE_REELLE)[number]) => string
    // La liste des paliers fautifs s'affiche si l'attendu n'est pas vide.
    expect(GRILLE_REELLE.filter((palier) => /^—/.test(format(palier)))).toEqual([])
  })

  it('le format officiel porte l’indice de chaque palier', () => {
    for (const palier of GRILLE_REELLE) {
      expect(formaterClasseEchelonIndice(palier)).toContain(String(palier.indice))
    }
  })

  it('le format compact porte l’indice de chaque palier à échelon numéroté, Assistants compris', () => {
    // Les paliers sans échelon (Délégué, Stagiaire, Classe Exceptionnelle, Hors Échelle)
    // s'écrivent par leur abréviation, sans indice : c'est le format du rapport imprimé.
    for (const palier of GRILLE_REELLE.filter((p) => p.echelon != null)) {
      expect(formaterPositionCompacte(palier)).toContain(String(palier.indice))
    }
  })
})
