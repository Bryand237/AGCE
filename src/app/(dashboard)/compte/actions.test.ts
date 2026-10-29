import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base, Next.js et bcrypt sont simulés : on vérifie ce que chaque action décide et répond,
// pas leur moteur (bcrypt et les sessions sont testés dans src/lib/comptes).
const {
  appliquerIdentifiants,
  cookieDeSession,
  exigerUtilisateur,
  identifiantsInitiaux,
  motDePasseCorrect,
  prismaFactice,
  recupererUtilisateurConnecte,
  revalidatePath,
} = vi.hoisted(() => ({
  appliquerIdentifiants: vi.fn(),
  cookieDeSession: { get: vi.fn(), delete: vi.fn() },
  exigerUtilisateur: vi.fn(),
  identifiantsInitiaux: vi.fn(),
  motDePasseCorrect: vi.fn(),
  prismaFactice: {},
  recupererUtilisateurConnecte: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('@/lib/auth', () => ({ exigerUtilisateur, recupererUtilisateurConnecte }))
vi.mock('@/lib/comptes/identifiants', () => ({
  appliquerIdentifiants,
  identifiantsInitiaux,
  motDePasseCorrect,
}))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('next/headers', () => ({ cookies: async () => cookieDeSession }))
// Comme dans Next.js, redirect() interrompt l'exécution en levant une exception.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))

const { modifierIdentifiants, retablirIdentifiantsInitiaux } = await import('./actions')

const erreurPrisma = (code: string, meta: Record<string, unknown> = {}) =>
  Object.assign(new Error(`erreur ${code}`), { name: 'PrismaClientKnownRequestError', code, meta })

function formulaire(valeurs: Record<string, string> = {}) {
  return {
    [Symbol.iterator]: () => Object.entries(valeurs)[Symbol.iterator](),
    get: (cle: string) => valeurs[cle] ?? null,
  } as unknown as FormData
}

const UTILISATEUR = { id: 'u-1', nomUtilisateur: 'MBALA', motDePasseHash: 'empreinte' }
const INITIAUX = { nomUtilisateur: 'ADMIN', motDePasse: 'mot-de-passe-initial' }

beforeEach(() => {
  vi.clearAllMocks()
  exigerUtilisateur.mockResolvedValue(UTILISATEUR)
  recupererUtilisateurConnecte.mockResolvedValue(UTILISATEUR)
  motDePasseCorrect.mockResolvedValue(true)
  appliquerIdentifiants.mockResolvedValue(undefined)
  identifiantsInitiaux.mockReturnValue(INITIAUX)
  cookieDeSession.get.mockReturnValue({ value: 'jeton-courant' })
})

describe('modifierIdentifiants', () => {
  const saisie = (surcharge: Record<string, string> = {}) =>
    formulaire({ motDePasseActuel: 'actuel', nomUtilisateur: 'MBALA', ...surcharge })

  it('exige une session : sans elle, renvoie vers la connexion sans rien lire ni écrire', async () => {
    exigerUtilisateur.mockRejectedValue(new Error('NEXT_REDIRECT /connexion'))

    await expect(modifierIdentifiants({}, saisie())).rejects.toThrow('NEXT_REDIRECT /connexion')
    expect(motDePasseCorrect).not.toHaveBeenCalled()
    expect(appliquerIdentifiants).not.toHaveBeenCalled()
  })

  it('refuse une saisie invalide, champ par champ, sans toucher à la base', async () => {
    const etat = await modifierIdentifiants(
      {},
      saisie({ nouveauMotDePasse: 'mot-de-passe-9', confirmation: 'autre-chose' })
    )

    expect(etat.errors?.confirmation).toEqual([
      'La confirmation est différente du nouveau mot de passe.',
    ])
    expect(etat.message).toMatch(/confirmation/)
    expect(appliquerIdentifiants).not.toHaveBeenCalled()
  })

  it('refuse un mot de passe actuel incorrect, sans rien modifier', async () => {
    motDePasseCorrect.mockResolvedValue(false)

    const etat = await modifierIdentifiants({}, saisie({ nomUtilisateur: 'NOUVEAU' }))

    expect(etat.errors?.motDePasseActuel).toEqual(['Le mot de passe actuel est incorrect.'])
    expect(motDePasseCorrect).toHaveBeenCalledWith('actuel', 'empreinte')
    expect(appliquerIdentifiants).not.toHaveBeenCalled()
  })

  it('dit qu’il n’y a rien à modifier quand rien ne change', async () => {
    const etat = await modifierIdentifiants({}, saisie())

    expect(etat.message).toMatch(/Rien à modifier/)
    expect(etat.succes).toBeUndefined()
    expect(appliquerIdentifiants).not.toHaveBeenCalled()
  })

  it('change l’identifiant seul, sans mot de passe, et recharge l’en-tête', async () => {
    const etat = await modifierIdentifiants({}, saisie({ nomUtilisateur: 'NOUVEAU' }))

    expect(appliquerIdentifiants).toHaveBeenCalledWith(
      prismaFactice,
      'u-1',
      { nomUtilisateur: 'NOUVEAU', motDePasse: undefined },
      { jetonAConserver: 'jeton-courant' }
    )
    expect(etat).toEqual({ message: 'Identifiant enregistré.', succes: true })
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('change le mot de passe en gardant la session de celui qui le change', async () => {
    const etat = await modifierIdentifiants(
      {},
      saisie({ nouveauMotDePasse: 'mot-de-passe-9', confirmation: 'mot-de-passe-9' })
    )

    expect(appliquerIdentifiants).toHaveBeenCalledWith(
      prismaFactice,
      'u-1',
      { nomUtilisateur: 'MBALA', motDePasse: 'mot-de-passe-9' },
      { jetonAConserver: 'jeton-courant' }
    )
    expect(etat.succes).toBe(true)
    expect(etat.message).toMatch(/sessions ouvertes.*fermées/)
  })

  it('annonce un identifiant déjà pris, sans le confondre avec une autre erreur', async () => {
    appliquerIdentifiants.mockRejectedValue(erreurPrisma('P2002', { target: ['nomUtilisateur'] }))

    const etat = await modifierIdentifiants({}, saisie({ nomUtilisateur: 'PRIS' }))

    expect(etat.message).toBe('Cet identifiant est déjà utilisé par un autre compte.')
    expect(etat.succes).toBeUndefined()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('répond que la base est injoignable quand elle l’est', async () => {
    const erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})
    appliquerIdentifiants.mockRejectedValue(erreurPrisma('P1001'))

    const etat = await modifierIdentifiants({}, saisie({ nomUtilisateur: 'NOUVEAU' }))

    expect(etat.message).toMatch(/injoignable/)
    erreurConsole.mockRestore()
  })
})

describe('retablirIdentifiantsInitiaux', () => {
  const saisie = () => formulaire({ motDePasseActuel: 'actuel' })

  it('exige une session', async () => {
    exigerUtilisateur.mockRejectedValue(new Error('NEXT_REDIRECT /connexion'))

    await expect(retablirIdentifiantsInitiaux({}, saisie())).rejects.toThrow(
      'NEXT_REDIRECT /connexion'
    )
    expect(appliquerIdentifiants).not.toHaveBeenCalled()
  })

  it('exige le mot de passe actuel : une session laissée ouverte ne suffit pas', async () => {
    motDePasseCorrect.mockResolvedValue(false)

    const etat = await retablirIdentifiantsInitiaux({}, saisie())

    expect(etat.errors?.motDePasseActuel).toEqual(['Le mot de passe actuel est incorrect.'])
    expect(appliquerIdentifiants).not.toHaveBeenCalled()
    expect(cookieDeSession.delete).not.toHaveBeenCalled()
  })

  it('refuse sans rien modifier quand .env ne contient pas les identifiants initiaux', async () => {
    identifiantsInitiaux.mockReturnValue(null)

    const etat = await retablirIdentifiantsInitiaux({}, saisie())

    expect(etat.message).toMatch(/ADMIN_USERNAME et ADMIN_PASSWORD/)
    expect(appliquerIdentifiants).not.toHaveBeenCalled()
    expect(cookieDeSession.delete).not.toHaveBeenCalled()
  })

  it('rétablit les identifiants du .env, ferme toutes les sessions et renvoie à la connexion', async () => {
    await expect(retablirIdentifiantsInitiaux({}, saisie())).rejects.toThrow(
      'NEXT_REDIRECT /connexion?initiaux=1'
    )

    // Aucun jeton à conserver : la session courante est fermée aussi.
    expect(appliquerIdentifiants).toHaveBeenCalledWith(prismaFactice, 'u-1', INITIAUX)
    expect(cookieDeSession.delete).toHaveBeenCalledWith('session')
  })

  it('reste sur la page, avec un message, quand l’identifiant initial est pris', async () => {
    appliquerIdentifiants.mockRejectedValue(erreurPrisma('P2002', { target: ['nomUtilisateur'] }))

    const etat = await retablirIdentifiantsInitiaux({}, saisie())

    expect(etat.message).toBe('Cet identifiant est déjà utilisé par un autre compte.')
    expect(cookieDeSession.delete).not.toHaveBeenCalled()
  })
})
