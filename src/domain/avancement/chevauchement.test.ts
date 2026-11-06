import { describe, expect, it } from 'vitest'
import { avertissementChevauchement } from './chevauchement'

const A = {
  numero: '55ème',
  periodeDebut: new Date('2026-03-01'),
  periodeFin: new Date('2026-09-30'),
}
const B = {
  numero: '54ème',
  periodeDebut: new Date('2025-12-01'),
  periodeFin: new Date('2026-04-15'),
}

describe('avertissementChevauchement', () => {
  it('cite le rapport en conflit avec son numéro et sa période en jj/mm/aaaa', () => {
    const message = avertissementChevauchement([A], 'creation')

    expect(message).toContain('Un autre rapport en brouillon couvre déjà cette période')
    expect(message).toContain('« 55ème » (du 01/03/2026 au 30/09/2026)')
    expect(message).toContain('Valider les deux ferait avancer les mêmes enseignants deux fois.')
  })

  it('cite tous les rapports et passe au pluriel', () => {
    const message = avertissementChevauchement([A, B], 'creation')

    expect(message).toContain('D’autres rapports en brouillon couvrent déjà cette période')
    expect(message).toContain('« 55ème »')
    expect(message).toContain('« 54ème » (du 01/12/2025 au 15/04/2026)')
    expect(message).toContain('Les valider tous')
  })

  it('à la création, dit que rien n’a été créé', () => {
    const message = avertissementChevauchement([A], 'creation')

    expect(message).toMatch(
      /Rien n’a été créé : changez la période, ou créez ce rapport quand même\.$/
    )
  })

  it('à la modification, dit que rien n’a été enregistré', () => {
    const message = avertissementChevauchement([A], 'modification')

    expect(message).toMatch(
      /Rien n’a été enregistré : changez la période, ou enregistrez quand même\.$/
    )
    expect(message).not.toMatch(/créé/)
  })
})
