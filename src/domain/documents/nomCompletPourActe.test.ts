import { describe, expect, it } from 'vitest'
import { nomCompletPourActe } from './nomCompletPourActe'

describe('nomCompletPourActe', () => {
  it('met le nom et le prénom en capitales, accents compris', () => {
    expect(nomCompletPourActe('Akoa Owona', 'Placide')).toBe('AKOA OWONA PLACIDE')
    expect(nomCompletPourActe('Ngwa', 'Divine Fuhnwi')).toBe('NGWA DIVINE FUHNWI')
    expect(nomCompletPourActe('Mbétoumou', 'Marceline')).toBe('MBÉTOUMOU MARCELINE')
  })

  it('garde l’apostrophe du nom', () => {
    expect(nomCompletPourActe('BILO’O', 'Brigitte Marie Noel')).toBe('BILO’O BRIGITTE MARIE NOEL')
  })

  it('supprime les espaces en trop', () => {
    expect(nomCompletPourActe(' Akoa  Owona ', ' Placide ')).toBe('AKOA OWONA PLACIDE')
  })
})
