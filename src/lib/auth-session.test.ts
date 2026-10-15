import { beforeEach, describe, expect, it, vi } from 'vitest'

// Next.js (cookies) et la base sont simulés : on vérifie la décision, pas leur moteur.
const { cookieDeSession, prismaFactice } = vi.hoisted(() => ({
  cookieDeSession: { valeur: undefined as string | undefined },
  prismaFactice: { session: { findUnique: vi.fn() } },
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nom: string) =>
      nom === 'session' && cookieDeSession.valeur ? { value: cookieDeSession.valeur } : undefined,
  }),
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))

const { refuserSiNonConnecte } = await import('./auth')

const UTILISATEUR = { id: 'u-1', nomUtilisateur: 'MBALA' }
const dans = (ms: number) => new Date(Date.now() + ms)

describe('refuserSiNonConnecte', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cookieDeSession.valeur = undefined
  })

  it('répond 401 en JSON, sans consulter la base, quand il n’y a pas de cookie', async () => {
    const refus = await refuserSiNonConnecte()

    expect(refus?.status).toBe(401)
    expect(await refus?.json()).toEqual({ message: 'Connexion requise.' })
    expect(prismaFactice.session.findUnique).not.toHaveBeenCalled()
  })

  it('répond 401 quand la session est inconnue', async () => {
    cookieDeSession.valeur = 'jeton-inconnu'
    prismaFactice.session.findUnique.mockResolvedValue(null)

    expect((await refuserSiNonConnecte())?.status).toBe(401)
  })

  it('répond 401 quand la session a expiré', async () => {
    cookieDeSession.valeur = 'jeton-expire'
    prismaFactice.session.findUnique.mockResolvedValue({
      expiresAt: dans(-1000),
      utilisateur: UTILISATEUR,
    })

    expect((await refuserSiNonConnecte())?.status).toBe(401)
  })

  it('renvoie null (accès autorisé) quand la session est valide', async () => {
    cookieDeSession.valeur = 'jeton-valide'
    prismaFactice.session.findUnique.mockResolvedValue({
      expiresAt: dans(60 * 60 * 1000),
      utilisateur: UTILISATEUR,
    })

    expect(await refuserSiNonConnecte()).toBeNull()
    expect(prismaFactice.session.findUnique).toHaveBeenCalledWith({
      where: { token: 'jeton-valide' },
      include: { utilisateur: true },
    })
  })
})
