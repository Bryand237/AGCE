import { describe, expect, it } from 'vitest'
import { contientTousLesMots, recherchePeutRestreindre } from './contientTousLesMots'

describe('contientTousLesMots', () => {
  const textes = ['MBARGA', 'Alice Marie', '0652 125K']

  it('trouve par un seul mot', () => {
    expect(contientTousLesMots('mbarga', textes)).toBe(true)
    expect(contientTousLesMots('marie', textes)).toBe(true)
  })

  it('trouve par plusieurs mots, dans n’importe quel ordre', () => {
    expect(contientTousLesMots('Alice Mbarga', textes)).toBe(true)
    expect(contientTousLesMots('mbarga alice', textes)).toBe(true)
  })

  it('trouve par des débuts de mots', () => {
    expect(contientTousLesMots('MBA ali', textes)).toBe(true)
  })

  it('exige que CHAQUE mot se retrouve', () => {
    expect(contientTousLesMots('alice dupont', textes)).toBe(false)
  })

  it('ignore casse et accents, dans les deux sens', () => {
    expect(contientTousLesMots('ÉLISE', ['Elise'])).toBe(true)
    expect(contientTousLesMots('elise', ['Élise'])).toBe(true)
    expect(contientTousLesMots('54eme', ['54ème'])).toBe(true)
  })

  it('ignore la ponctuation', () => {
    expect(contientTousLesMots('nyong et so o', ['Nyong-et-So’o'])).toBe(true)
    expect(contientTousLesMots('Nyong-et-So’o', ['Nyong et So o'])).toBe(true)
  })

  it('cherche dans tous les textes, pas dans un seul', () => {
    // « alice » est dans le deuxième texte et « 125k » dans le troisième.
    expect(contientTousLesMots('alice 125k', textes)).toBe(true)
  })

  it('ne trouve rien sans texte où chercher', () => {
    expect(contientTousLesMots('alice', [])).toBe(false)
  })

  it('une saisie vide ou sans caractère utile ne restreint rien', () => {
    expect(contientTousLesMots('', textes)).toBe(true)
    expect(contientTousLesMots('   ', textes)).toBe(true)
    expect(contientTousLesMots(' - . ', textes)).toBe(true)
    expect(contientTousLesMots('', [])).toBe(true)
  })
})

describe('recherchePeutRestreindre', () => {
  it.each([
    ['vide', ''],
    ['des espaces', '   '],
    ['de la ponctuation', ' - . '],
  ])('est faux pour une saisie %s', (_cas, saisie) => {
    expect(recherchePeutRestreindre(saisie)).toBe(false)
  })

  it('est vrai dès qu’un mot est saisi', () => {
    expect(recherchePeutRestreindre('a')).toBe(true)
    expect(recherchePeutRestreindre('  54 ')).toBe(true)
  })
})
