import bcrypt from 'bcryptjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COUT_BCRYPT } from '@/lib/comptes/identifiants'
import { verifierMotDePasse } from './mot-de-passe'

// Coût 4 (le minimum) : ces tests n'ont pas besoin de la lenteur d'un vrai hash.
const HASH_DE_BON_MOT_DE_PASSE = bcrypt.hashSync('bon-mot-de-passe', 4)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('verifierMotDePasse — compte existant', () => {
  it('accepte le bon mot de passe', async () => {
    expect(await verifierMotDePasse('bon-mot-de-passe', HASH_DE_BON_MOT_DE_PASSE)).toBe(true)
  })

  it('refuse un autre mot de passe', async () => {
    expect(await verifierMotDePasse('mauvais', HASH_DE_BON_MOT_DE_PASSE)).toBe(false)
  })
})

describe('verifierMotDePasse — identifiant inconnu', () => {
  it('fabrique le hash factice une seule fois, puis le garde', async () => {
    const hacher = vi.spyOn(bcrypt, 'hash')

    await verifierMotDePasse('un', undefined)
    await verifierMotDePasse('deux', undefined)
    await verifierMotDePasse('trois', undefined)

    // Fabriquer un hash à chaque connexion doublerait le temps de réponse (hash puis compare).
    expect(hacher.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('refuse toujours, quel que soit le mot de passe', async () => {
    expect(await verifierMotDePasse('bon-mot-de-passe', undefined)).toBe(false)
    expect(await verifierMotDePasse('', undefined)).toBe(false)
  })

  it('compare quand même à un VRAI hash bcrypt, du même coût que les comptes réels', async () => {
    const comparer = vi.spyOn(bcrypt, 'compare')

    await verifierMotDePasse('n-importe-quoi', undefined)

    // Un calcul a bien lieu, sur un hash qui a la longueur et le coût d'un hash bcrypt :
    // bcryptjs répond « faux » sans calcul à toute chaîne qui n'a pas 60 caractères.
    expect(comparer).toHaveBeenCalledTimes(1)
    const hashUtilise = comparer.mock.calls[0]![1] as string
    expect(hashUtilise).toHaveLength(60)
    expect(hashUtilise).toMatch(new RegExp(`^\\$2[aby]\\$${COUT_BCRYPT}\\$`))
  })
})
