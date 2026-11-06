import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dateEnClair, Recapitulatif, texteEnClair } from './recapitulatif'

describe('dateEnClair', () => {
  it('écrit la date en toutes lettres', () => {
    expect(dateEnClair('2026-11-02')).toBe('2 novembre 2026')
    expect(dateEnClair('2027-01-01')).toBe('1 janvier 2027')
  })

  it('ne dépend pas du fuseau horaire de l’ordinateur', () => {
    const avant = process.env.TZ
    try {
      for (const fuseau of ['Pacific/Honolulu', 'Africa/Douala', 'Pacific/Auckland']) {
        process.env.TZ = fuseau
        expect(dateEnClair('2026-03-01')).toBe('1 mars 2026')
      }
    } finally {
      if (avant === undefined) delete process.env.TZ
      else process.env.TZ = avant
    }
  })

  it('renvoie un tiret quand la valeur est vide ou invalide', () => {
    expect(dateEnClair('')).toBe('—')
    expect(dateEnClair(null)).toBe('—')
    expect(dateEnClair('02/11/2026')).toBe('—')
  })
})

describe('texteEnClair', () => {
  it('retire les espaces autour, ou renvoie un tiret', () => {
    expect(texteEnClair('  0000123 ')).toBe('0000123')
    expect(texteEnClair('   ')).toBe('—')
    expect(texteEnClair(null)).toBe('—')
  })
})

describe('Recapitulatif', () => {
  it('affiche chaque libellé avec sa valeur', () => {
    render(
      <Recapitulatif
        lignes={[
          { libelle: 'Date de retour', valeur: '2 novembre 2026' },
          { libelle: 'Auteur', valeur: 'Le Recteur' },
        ]}
      />
    )
    expect(screen.getByText('Date de retour').closest('div')).toHaveTextContent('2 novembre 2026')
    expect(screen.getByText('Auteur').closest('div')).toHaveTextContent('Le Recteur')
  })
})
