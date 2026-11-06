import { afterEach, describe, expect, it, vi } from 'vitest'
import { purgerSessionsExpirees } from './sessions'

function clientAvec(deleteMany: ReturnType<typeof vi.fn>) {
  return { session: { deleteMany } } as unknown as Parameters<typeof purgerSessionsExpirees>[0]
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('purgerSessionsExpirees', () => {
  it('supprime les sessions dont la date est dépassée, et elles seules', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 3 })
    const maintenant = new Date('2026-11-01T10:00:00.000Z')

    const supprimees = await purgerSessionsExpirees(clientAvec(deleteMany), maintenant)

    expect(deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: maintenant } } })
    expect(supprimees).toBe(3)
  })

  it('ne fait pas échouer la connexion quand la purge échoue : l’erreur est consignée', async () => {
    const erreur = new Error('base indisponible')
    const deleteMany = vi.fn().mockRejectedValue(erreur)
    const consigner = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(purgerSessionsExpirees(clientAvec(deleteMany))).resolves.toBe(0)

    expect(consigner).toHaveBeenCalledWith(expect.any(String), erreur)
  })
})
