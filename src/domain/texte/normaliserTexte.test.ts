import { describe, expect, it } from 'vitest'
import { motsNormalises, normaliserTexte } from './normaliserTexte'

describe('normaliserTexte', () => {
  it('passe en minuscules et retire les accents', () => {
    expect(normaliserTexte('Extrême-Nord')).toBe('extreme nord')
    expect(normaliserTexte('NDÉ')).toBe('nde')
    expect(normaliserTexte('Chargé de Cours')).toBe('charge de cours')
  })

  it('remplace apostrophes, tirets et points par une espace, sans doublon', () => {
    expect(normaliserTexte("Département d'Histoire")).toBe('departement d histoire')
    expect(normaliserTexte('Nyong-et-So’o')).toBe('nyong et so o')
    expect(normaliserTexte('  a  .  b ')).toBe('a b')
  })

  it('traite les ligatures et la cédille', () => {
    expect(normaliserTexte('Cœur')).toBe('coeur')
    expect(normaliserTexte('François')).toBe('francois')
  })

  it('conserve les chiffres et les lettres du matricule', () => {
    expect(normaliserTexte('0652 125K')).toBe('0652 125k')
    expect(normaliserTexte('548 452-X')).toBe('548 452 x')
  })

  it('renvoie une chaîne vide pour une saisie vide ou sans caractère utile', () => {
    expect(normaliserTexte('')).toBe('')
    expect(normaliserTexte('  -- ')).toBe('')
  })
})

describe('motsNormalises', () => {
  it('découpe une saisie en mots comparables', () => {
    expect(motsNormalises('  Alice   MBARGA ')).toEqual(['alice', 'mbarga'])
  })

  it('renvoie une liste vide pour une saisie vide', () => {
    expect(motsNormalises('   ')).toEqual([])
  })
})
