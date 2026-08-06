import { describe, expect, it } from 'vitest'
import { determinerDestinationInitiale } from '../domain/auth/determinerDestinationInitiale'

describe('determinerDestinationInitiale', () => {
  it('redirige vers la page de connexion si aucun utilisateur n’est connecté', () => {
    expect(determinerDestinationInitiale(null)).toBe('/connexion')
  })

  it('redirige vers le tableau de bord si un utilisateur est connecté', () => {
    expect(determinerDestinationInitiale({ nomUtilisateur: 'Admin' } as never)).toBe('/dashboard')
  })
})
