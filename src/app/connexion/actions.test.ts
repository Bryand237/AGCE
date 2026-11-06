import bcrypt from 'bcryptjs'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

// Next.js (cookies, redirect) et la base sont simulés : on vérifie les décisions de l'action.
const { cookieStore, prismaFactice } = vi.hoisted(() => ({
  cookieStore: { set: vi.fn(), delete: vi.fn(), get: vi.fn() },
  prismaFactice: {
    utilisateur: { findUnique: vi.fn() },
    session: { create: vi.fn(), deleteMany: vi.fn() },
  },
}))

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
// Comme dans Next.js, redirect() interrompt l'exécution en levant une exception.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))

const { seConnecter, seDeconnecter } = await import('./actions')
const { limiteConnexions } = await import('@/lib/connexion/limite-tentatives')

const MINUTE = 60 * 1000
const HEURE = 60 * MINUTE
const MAINTENANT = new Date('2026-11-01T10:00:00.000Z').getTime()

// Coût 4 (le minimum) : le test n'a pas besoin de la lenteur d'un vrai hash.
const UTILISATEUR = {
  id: 'u-1',
  nomUtilisateur: 'MBALA',
  motDePasseHash: bcrypt.hashSync('bon-mot-de-passe', 4),
}

function formulaire(champs: Record<string, string>) {
  const donnees = new FormData()
  for (const [nom, valeur] of Object.entries(champs)) donnees.set(nom, valeur)
  return donnees
}

const bonneSaisie = { nomUtilisateur: 'MBALA', motDePasse: 'bon-mot-de-passe' }
const mauvaiseSaisie = { nomUtilisateur: 'MBALA', motDePasse: 'mauvais' }

const connecter = (champs: Record<string, string>) => seConnecter({}, formulaire(champs))

describe('seConnecter', () => {
  let horloge: MockInstance<typeof Date.now>

  beforeEach(() => {
    vi.clearAllMocks()
    limiteConnexions.vider()
    horloge = vi.spyOn(Date, 'now').mockReturnValue(MAINTENANT)
    prismaFactice.utilisateur.findUnique.mockImplementation(
      async ({ where }: { where: { nomUtilisateur: string } }) =>
        where.nomUtilisateur === UTILISATEUR.nomUtilisateur ? UTILISATEUR : null
    )
    prismaFactice.session.create.mockResolvedValue({})
    prismaFactice.session.deleteMany.mockResolvedValue({ count: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('connexion réussie', () => {
    it('ouvre une session de 12 heures, pose le cookie et renvoie au tableau de bord', async () => {
      await expect(connecter(bonneSaisie)).rejects.toThrow('NEXT_REDIRECT /dashboard')

      const { data } = prismaFactice.session.create.mock.calls[0]![0]
      expect(data.utilisateurId).toBe('u-1')
      expect(data.token).toMatch(/^[0-9a-f]{64}$/)
      expect(data.expiresAt).toEqual(new Date(MAINTENANT + 12 * HEURE))

      expect(cookieStore.set).toHaveBeenCalledWith(
        'session',
        data.token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          expires: data.expiresAt,
        })
      )
    })

    it('garde la session 30 jours quand « rester connecté » est coché', async () => {
      await expect(connecter({ ...bonneSaisie, seSouvenir: 'on' })).rejects.toThrow(
        'NEXT_REDIRECT /dashboard'
      )

      const { data } = prismaFactice.session.create.mock.calls[0]![0]
      expect(data.expiresAt).toEqual(new Date(MAINTENANT + 30 * 24 * HEURE))
    })

    it('supprime les sessions expirées', async () => {
      await expect(connecter(bonneSaisie)).rejects.toThrow('NEXT_REDIRECT /dashboard')

      expect(prismaFactice.session.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      })
    })

    it('se connecte même si la purge des sessions expirées échoue', async () => {
      prismaFactice.session.deleteMany.mockRejectedValue(new Error('base occupée'))
      vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(connecter(bonneSaisie)).rejects.toThrow('NEXT_REDIRECT /dashboard')
      expect(cookieStore.set).toHaveBeenCalled()
    })
  })

  describe('connexion refusée', () => {
    it('refuse un mauvais mot de passe sans ouvrir de session', async () => {
      expect(await connecter(mauvaiseSaisie)).toEqual({ message: 'Identifiants incorrects.' })

      expect(prismaFactice.session.create).not.toHaveBeenCalled()
      expect(prismaFactice.session.deleteMany).not.toHaveBeenCalled()
      expect(cookieStore.set).not.toHaveBeenCalled()
    })

    it('répond la même chose pour un identifiant inconnu : on ne dit pas lequel est faux', async () => {
      const inconnu = await connecter({ nomUtilisateur: 'personne', motDePasse: 'x' })
      const mauvais = await connecter(mauvaiseSaisie)

      expect(inconnu).toEqual(mauvais)
      expect(prismaFactice.session.create).not.toHaveBeenCalled()
    })

    it('compare le mot de passe à un vrai hash même quand l’identifiant est inconnu', async () => {
      const comparer = vi.spyOn(bcrypt, 'compare')

      await connecter({ nomUtilisateur: 'personne', motDePasse: 'x' })

      // Sans comparaison, la réponse serait bien plus rapide que pour un compte existant.
      expect(comparer).toHaveBeenCalledTimes(1)
      expect(comparer.mock.calls[0]![1]).toHaveLength(60)
    })

    const formulairesIncomplets: [string, Record<string, string>][] = [
      ['sans identifiant', { motDePasse: 'x' }],
      ['sans mot de passe', { nomUtilisateur: 'MBALA' }],
      ['avec un identifiant vide', { nomUtilisateur: '', motDePasse: 'x' }],
      ['avec un identifiant démesuré', { nomUtilisateur: 'a'.repeat(5000), motDePasse: 'x' }],
    ]

    it.each(formulairesIncomplets)(
      'refuse un formulaire %s, sans interroger la base',
      async (_cas, champs) => {
        expect(await connecter(champs)).toEqual({ message: 'Identifiants incorrects.' })
        expect(prismaFactice.utilisateur.findUnique).not.toHaveBeenCalled()
      }
    )
  })

  describe('limite des tentatives', () => {
    async function rater(fois: number, saisie = mauvaiseSaisie) {
      for (let n = 0; n < fois; n++) await connecter(saisie)
    }

    it('bloque après cinq essais manqués, même avec le bon mot de passe', async () => {
      await rater(5)
      prismaFactice.utilisateur.findUnique.mockClear()

      const reponse = await connecter(bonneSaisie)

      expect(reponse.message).toMatch(
        /^Trop de tentatives de connexion\. Réessayez dans 5 minutes\.$/
      )
      // Refusé avant tout : ni lecture de la base, ni calcul de hash, ni session.
      expect(prismaFactice.utilisateur.findUnique).not.toHaveBeenCalled()
      expect(prismaFactice.session.create).not.toHaveBeenCalled()
    })

    it('laisse passer le cinquième essai (le bon) après quatre échecs', async () => {
      await rater(4)

      await expect(connecter(bonneSaisie)).rejects.toThrow('NEXT_REDIRECT /dashboard')
    })

    it('annonce le temps restant, qui diminue avec l’horloge', async () => {
      await rater(5)
      horloge.mockReturnValue(MAINTENANT + 3 * MINUTE)

      expect((await connecter(bonneSaisie)).message).toContain('dans 2 minutes')
    })

    it('rouvre la connexion cinq minutes après le premier essai', async () => {
      await rater(5)

      horloge.mockReturnValue(MAINTENANT + 5 * MINUTE)

      await expect(connecter(bonneSaisie)).rejects.toThrow('NEXT_REDIRECT /dashboard')
    })

    it('remet le compteur à zéro après une connexion réussie', async () => {
      await rater(4)
      await expect(connecter(bonneSaisie)).rejects.toThrow('NEXT_REDIRECT /dashboard')

      await rater(4)
      await expect(connecter(bonneSaisie)).rejects.toThrow('NEXT_REDIRECT /dashboard')
    })

    it('ne bloque que l’identifiant visé', async () => {
      await rater(5)
      prismaFactice.utilisateur.findUnique.mockImplementation(async () => ({
        ...UTILISATEUR,
        nomUtilisateur: 'AUTRE',
      }))

      await expect(
        connecter({ nomUtilisateur: 'AUTRE', motDePasse: 'bon-mot-de-passe' })
      ).rejects.toThrow('NEXT_REDIRECT /dashboard')
    })

    it('ne se contourne pas en changeant la casse de l’identifiant', async () => {
      await rater(5)

      const reponse = await connecter({ ...bonneSaisie, nomUtilisateur: 'mbala' })

      expect(reponse.message).toContain('Trop de tentatives')
    })

    it('bloque aussi un identifiant qui n’existe pas : le blocage ne révèle pas le compte', async () => {
      const inconnu = { nomUtilisateur: 'personne', motDePasse: 'x' }
      await rater(5, inconnu)

      expect((await connecter(inconnu)).message).toContain('Trop de tentatives')
    })

    it('compte les essais lancés en même temps : seuls cinq vont jusqu’à la vérification', async () => {
      // Huit requêtes envoyées ensemble, avant que la première ait fini de vérifier.
      prismaFactice.utilisateur.findUnique.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        return UTILISATEUR
      })

      const reponses = await Promise.all(Array.from({ length: 8 }, () => connecter(mauvaiseSaisie)))

      expect(prismaFactice.utilisateur.findUnique).toHaveBeenCalledTimes(5)
      expect(reponses.filter((r) => r.message?.includes('Trop de tentatives'))).toHaveLength(3)
    })
  })
})

describe('seDeconnecter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaFactice.session.deleteMany.mockResolvedValue({ count: 1 })
  })

  it('ferme la session du cookie, efface le cookie et renvoie à la connexion', async () => {
    cookieStore.get.mockReturnValue({ value: 'jeton-123' })

    await expect(seDeconnecter()).rejects.toThrow('NEXT_REDIRECT /connexion')

    expect(prismaFactice.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'jeton-123' } })
    expect(cookieStore.delete).toHaveBeenCalledWith('session')
  })

  it('renvoie à la connexion sans toucher à la base quand il n’y a pas de cookie', async () => {
    cookieStore.get.mockReturnValue(undefined)

    await expect(seDeconnecter()).rejects.toThrow('NEXT_REDIRECT /connexion')

    expect(prismaFactice.session.deleteMany).not.toHaveBeenCalled()
  })
})
