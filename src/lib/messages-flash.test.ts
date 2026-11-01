import { describe, expect, it } from 'vitest'
import { avecMessage, lireMessage, MESSAGES_FLASH, PARAMETRE_MESSAGE } from './messages-flash'

describe('avecMessage', () => {
  it('ajoute le code à une adresse sans paramètre', () => {
    expect(avecMessage('/enseignants', 'enseignant_cree')).toBe('/enseignants?msg=enseignant_cree')
  })

  it('ajoute le code à la suite des paramètres existants', () => {
    expect(avecMessage('/absences?page=2', 'absence_supprimee')).toBe(
      '/absences?page=2&msg=absence_supprimee'
    )
  })
})

describe('lireMessage', () => {
  it('retrouve le message d’un code connu', () => {
    expect(lireMessage('rapport_valide')).toMatchObject({ ton: 'succes' })
  })

  it.each([null, undefined, '', 'inconnu', '<script>alert(1)</script>'])(
    'ignore le code %j',
    (code) => {
      expect(lireMessage(code)).toBeUndefined()
    }
  )

  it('ne confond pas un code avec une propriété héritée de Object', () => {
    for (const piege of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(lireMessage(piege)).toBeUndefined()
    }
  })
})

describe('MESSAGES_FLASH', () => {
  it('donne à chaque code un texte non vide, sans balise', () => {
    for (const [code, { message }] of Object.entries(MESSAGES_FLASH)) {
      expect(message.trim(), code).not.toBe('')
      expect(message, code).not.toMatch(/[<>]/)
    }
  })

  it('utilise un nom de paramètre stable pour les adresses', () => {
    expect(PARAMETRE_MESSAGE).toBe('msg')
  })
})
