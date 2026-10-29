import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  appliquerIdentifiants,
  identifiantsInitiaux,
  motDePasseCorrect,
  retablirCompteAdministrateur,
} from './identifiants'

// La base est simulée : on vérifie ce qui lui est demandé (empreinte du mot de passe, sessions
// fermées), pas le moteur. Les empreintes, elles, sont de vraies empreintes bcrypt.
const clientFactice = {
  utilisateur: { update: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  session: { deleteMany: vi.fn() },
  // Transaction interactive : la fonction reçoit le même client simulé.
  $transaction: vi.fn(async (operations: (tx: unknown) => Promise<unknown>) =>
    operations(clientFactice)
  ),
}
const client = clientFactice as unknown as Parameters<typeof appliquerIdentifiants>[0]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('identifiantsInitiaux', () => {
  it('lit ADMIN_USERNAME et ADMIN_PASSWORD', () => {
    expect(identifiantsInitiaux({ ADMIN_USERNAME: 'MBALA', ADMIN_PASSWORD: 'secret' })).toEqual({
      nomUtilisateur: 'MBALA',
      motDePasse: 'secret',
    })
  })

  it('garde le mot de passe tel quel, espaces compris : le seed fait de même', () => {
    expect(
      identifiantsInitiaux({ ADMIN_USERNAME: 'MBALA', ADMIN_PASSWORD: ' a b ' })?.motDePasse
    ).toBe(' a b ')
  })

  it.each([
    [{}],
    [{ ADMIN_USERNAME: 'MBALA' }],
    [{ ADMIN_PASSWORD: 'secret' }],
    [{ ADMIN_USERNAME: '   ', ADMIN_PASSWORD: 'secret' }],
    [{ ADMIN_USERNAME: 'MBALA', ADMIN_PASSWORD: '' }],
  ])('renvoie null quand l’un des deux manque (%j)', (env) => {
    expect(identifiantsInitiaux(env)).toBeNull()
  })
})

describe('motDePasseCorrect', () => {
  const hash = bcrypt.hashSync('le-bon-mot-de-passe', 4)

  it('reconnaît le bon mot de passe et refuse les autres', async () => {
    expect(await motDePasseCorrect('le-bon-mot-de-passe', hash)).toBe(true)
    expect(await motDePasseCorrect('un-autre', hash)).toBe(false)
  })
})

describe('appliquerIdentifiants', () => {
  it('enregistre l’identifiant et l’empreinte du nouveau mot de passe, jamais le mot de passe', async () => {
    await appliquerIdentifiants(client, 'u-1', {
      nomUtilisateur: 'NOUVEAU',
      motDePasse: 'mot-de-passe-9',
    })

    const { where, data } = clientFactice.utilisateur.update.mock.calls[0]![0]
    expect(where).toEqual({ id: 'u-1' })
    expect(data.nomUtilisateur).toBe('NOUVEAU')
    expect(data.motDePasseHash).not.toContain('mot-de-passe-9')
    expect(await bcrypt.compare('mot-de-passe-9', data.motDePasseHash)).toBe(true)
  })

  it('ferme les autres sessions du compte quand le mot de passe change, pas la sienne', async () => {
    await appliquerIdentifiants(
      client,
      'u-1',
      { nomUtilisateur: 'MBALA', motDePasse: 'mot-de-passe-9' },
      { jetonAConserver: 'jeton-courant' }
    )

    expect(clientFactice.session.deleteMany).toHaveBeenCalledWith({
      where: { utilisateurId: 'u-1', token: { not: 'jeton-courant' } },
    })
  })

  it('ferme toutes les sessions quand aucune n’est à conserver', async () => {
    await appliquerIdentifiants(client, 'u-1', {
      nomUtilisateur: 'MBALA',
      motDePasse: 'mot-de-passe-9',
    })

    expect(clientFactice.session.deleteMany).toHaveBeenCalledWith({
      where: { utilisateurId: 'u-1' },
    })
  })

  it('un identifiant seul ne touche ni au mot de passe ni aux sessions', async () => {
    await appliquerIdentifiants(
      client,
      'u-1',
      { nomUtilisateur: 'NOUVEAU' },
      { jetonAConserver: 'j' }
    )

    const { data } = clientFactice.utilisateur.update.mock.calls[0]![0]
    expect(data).toEqual({ nomUtilisateur: 'NOUVEAU', motDePasseHash: undefined })
    expect(clientFactice.session.deleteMany).not.toHaveBeenCalled()
  })
})

describe('retablirCompteAdministrateur', () => {
  const INITIAUX = { nomUtilisateur: 'MBALA', motDePasse: 'mot-de-passe-initial' }

  it('remet le compte qui porte déjà l’identifiant initial, et ferme ses sessions', async () => {
    clientFactice.utilisateur.findMany.mockResolvedValue([
      { id: 'u-2', nomUtilisateur: 'AUTRE' },
      { id: 'u-1', nomUtilisateur: 'MBALA' },
    ])

    const resultat = await retablirCompteAdministrateur(client, INITIAUX)

    expect(resultat).toEqual({ nomUtilisateur: 'MBALA', resultat: 'mis_a_jour' })
    const { where, data } = clientFactice.utilisateur.update.mock.calls[0]![0]
    expect(where).toEqual({ id: 'u-1' })
    expect(await bcrypt.compare('mot-de-passe-initial', data.motDePasseHash)).toBe(true)
    expect(clientFactice.session.deleteMany).toHaveBeenCalledWith({
      where: { utilisateurId: 'u-1' },
    })
  })

  it('remet l’unique compte existant quand son identifiant a été modifié depuis', async () => {
    clientFactice.utilisateur.findMany.mockResolvedValue([{ id: 'u-1', nomUtilisateur: 'renomme' }])

    const resultat = await retablirCompteAdministrateur(client, INITIAUX)

    expect(resultat.resultat).toBe('mis_a_jour')
    expect(clientFactice.utilisateur.update.mock.calls[0]![0].data.nomUtilisateur).toBe('MBALA')
  })

  it('crée le compte quand il n’y en a aucun', async () => {
    clientFactice.utilisateur.findMany.mockResolvedValue([])

    const resultat = await retablirCompteAdministrateur(client, INITIAUX)

    expect(resultat).toEqual({ nomUtilisateur: 'MBALA', resultat: 'cree' })
    const { data } = clientFactice.utilisateur.create.mock.calls[0]![0]
    expect(data.nomUtilisateur).toBe('MBALA')
    expect(await bcrypt.compare('mot-de-passe-initial', data.motDePasseHash)).toBe(true)
  })

  it('ne devine pas : plusieurs comptes sans l’identifiant initial, rien n’est modifié', async () => {
    clientFactice.utilisateur.findMany.mockResolvedValue([
      { id: 'u-1', nomUtilisateur: 'A' },
      { id: 'u-2', nomUtilisateur: 'B' },
    ])

    await expect(retablirCompteAdministrateur(client, INITIAUX)).rejects.toThrow(
      /Plusieurs comptes existent.*« MBALA »/
    )
    expect(clientFactice.utilisateur.update).not.toHaveBeenCalled()
    expect(clientFactice.utilisateur.create).not.toHaveBeenCalled()
    expect(clientFactice.session.deleteMany).not.toHaveBeenCalled()
  })
})
