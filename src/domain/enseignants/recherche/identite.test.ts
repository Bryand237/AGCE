import { describe, expect, it } from 'vitest'
import { identiteCorrespond, textesDIdentite } from './identite'

const alice = { nom: 'MBARGA', prenom: 'Alice Marie', matricule: '0652 125K' }
const trouve = (recherche: string, enseignant = alice) => identiteCorrespond(enseignant, recherche)

describe('identiteCorrespond', () => {
  it('trouve par nom, prénom ou matricule', () => {
    expect(trouve('mbarga')).toBe(true)
    expect(trouve('marie')).toBe(true)
    expect(trouve('125k')).toBe(true)
  })

  it('« Alice Mbarga », « mbarga alice » et « MBA ali » trouvent Alice MBARGA — D6', () => {
    expect(trouve('Alice Mbarga')).toBe(true)
    expect(trouve('mbarga alice')).toBe(true)
    expect(trouve('MBA ali')).toBe(true)
  })

  it('tous les mots doivent correspondre', () => {
    expect(trouve('alice dupont')).toBe(false)
  })

  it('ignore casse et accents des deux côtés', () => {
    const elise = { nom: 'Ndé', prenom: 'Élise', matricule: 'A1' }
    expect(trouve('NDE ELISE', elise)).toBe(true)
    expect(trouve('ndé élise', elise)).toBe(true)
  })

  it('trouve le matricule avec ou sans espace', () => {
    expect(trouve('0652125K')).toBe(true)
    expect(trouve('0652 125K')).toBe(true)
    expect(trouve('0652125Z')).toBe(false)
  })

  it('ne cherche pas ailleurs que dans l’identité', () => {
    expect(trouve('geomatique')).toBe(false)
  })

  it('une saisie vide ne restreint rien', () => {
    expect(trouve('')).toBe(true)
    expect(trouve('  - ')).toBe(true)
  })
})

describe('textesDIdentite', () => {
  it('donne nom, prénom, matricule et matricule sans espace', () => {
    expect(textesDIdentite(alice)).toEqual(['MBARGA', 'Alice Marie', '0652 125K', '0652125k'])
  })
})
