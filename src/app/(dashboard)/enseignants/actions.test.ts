import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base, le disque et Next.js sont simulés : on vérifie ce que chaque action répond à
// l'écran selon la nature de l'erreur, pas le moteur de la base.
const { exigerUtilisateur, fsFactice, prismaFactice, revalidatePath } = vi.hoisted(() => ({
  exigerUtilisateur: vi.fn(),
  revalidatePath: vi.fn(),
  fsFactice: { mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() },
  prismaFactice: {
    echelonIndiciaire: { findUnique: vi.fn() },
    enseignant: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('@/lib/auth', () => ({ exigerUtilisateur }))
vi.mock('next/cache', () => ({ revalidatePath }))
// Comme dans Next.js, redirect() interrompt l'exécution en levant une exception.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))
vi.mock('fs/promises', () => ({ default: fsFactice, ...fsFactice }))

const {
  creerEnseignant,
  modifierEnseignant,
  marquerRetraite,
  marquerTransfere,
  reactiverEnseignant,
} = await import('./actions')

const erreurPrisma = (code: string, meta: Record<string, unknown> = {}) =>
  Object.assign(new Error(`erreur ${code}`), { name: 'PrismaClientKnownRequestError', code, meta })

const DEPARTEMENT = '3f2b8c1e-5a4d-4e6f-8a1b-2c3d4e5f6a7b'
const POSITION = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'

const SAISIE = {
  matricule: '12345',
  nom: 'MBARGA',
  prenom: 'Alice',
  sexe: 'F',
  dateNaissance: '1988-03-20',
  lieuNaissance: 'Yaoundé',
  datePriseService: '2018-09-01',
  estResident: 'oui',
  contratCollaboration: 'non',
  departementId: DEPARTEMENT,
  positionActuelleId: POSITION,
  dateEffetEchelon: '2018-09-01',
}

type Photo = { size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> }
const PHOTO: Photo = { size: 3, type: 'image/png', arrayBuffer: async () => new ArrayBuffer(3) }

/** Un formulaire de test : seules les méthodes utilisées par les actions sont fournies. */
function formulaire(valeurs: Record<string, string> = SAISIE, photo?: Photo) {
  return {
    [Symbol.iterator]: () => Object.entries(valeurs)[Symbol.iterator](),
    get: (cle: string) => (cle === 'photo' ? (photo ?? null) : (valeurs[cle] ?? null)),
  } as unknown as FormData
}

describe('actions enseignants : erreurs de la base', () => {
  let erreurConsole: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue({
      id: POSITION,
      grade: 'ASSISTANT',
    })
    prismaFactice.enseignant.create.mockResolvedValue({ id: 'ens-1' })
    prismaFactice.enseignant.findUnique.mockResolvedValue({
      id: 'ens-1',
      photoUrl: null,
      statut: 'ACTIF',
      datePriseService: new Date('2018-09-01'),
    })
    prismaFactice.enseignant.update.mockResolvedValue({})
    fsFactice.mkdir.mockResolvedValue(undefined)
    fsFactice.writeFile.mockResolvedValue(undefined)
    fsFactice.unlink.mockResolvedValue(undefined)
    erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('creerEnseignant', () => {
    it('annonce un doublon de matricule seulement pour une vraie violation d’unicité', async () => {
      prismaFactice.enseignant.create.mockRejectedValue(
        erreurPrisma('P2002', { target: ['matricule'] })
      )

      const etat = await creerEnseignant({}, formulaire())

      expect(etat.message).toBe('Ce matricule existe déjà.')
    })

    it('n’annonce PAS de doublon quand la base est injoignable', async () => {
      prismaFactice.enseignant.create.mockRejectedValue(erreurPrisma('P1001'))

      const etat = await creerEnseignant({}, formulaire())

      expect(etat.message).toMatch(/base de données est injoignable/)
      expect(etat.message).not.toMatch(/existe déjà/)
    })

    it('n’annonce PAS de doublon pour une erreur inattendue, et la journalise', async () => {
      const cause = new Error('connection terminated unexpectedly')
      prismaFactice.enseignant.create.mockRejectedValue(cause)

      const etat = await creerEnseignant({}, formulaire())

      expect(etat.message).toMatch(/erreur technique/i)
      expect(etat.message).not.toMatch(/existe déjà/)
      expect(erreurConsole).toHaveBeenCalledWith('creerEnseignant : erreur inattendue', cause)
    })

    it('répond par un message, sans lever d’exception, quand la grille est illisible', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockRejectedValue(erreurPrisma('P1001'))

      const etat = await creerEnseignant({}, formulaire())

      expect(etat.message).toMatch(/injoignable/)
      expect(prismaFactice.enseignant.create).not.toHaveBeenCalled()
    })

    it('signale une position de grille introuvable', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(null)

      const etat = await creerEnseignant({}, formulaire())

      expect(etat.message).toMatch(/Position de grille invalide/)
      expect(prismaFactice.enseignant.create).not.toHaveBeenCalled()
    })

    it('renvoie les erreurs de validation sans toucher à la base', async () => {
      const etat = await creerEnseignant({}, formulaire({ ...SAISIE, matricule: '' }))

      expect(etat.errors?.matricule).toBeDefined()
      expect(prismaFactice.enseignant.create).not.toHaveBeenCalled()
    })

    it('refuse une naissance dans le futur, avec un message en français, sans toucher à la base', async () => {
      const etat = await creerEnseignant({}, formulaire({ ...SAISIE, dateNaissance: '2099-01-01' }))

      expect(etat.errors?.dateNaissance).toEqual([
        'La date de naissance ne peut pas être dans le futur.',
      ])
      expect(prismaFactice.enseignant.create).not.toHaveBeenCalled()
    })

    it('revient à la liste après une création sans photo', async () => {
      await expect(creerEnseignant({}, formulaire())).rejects.toThrow('NEXT_REDIRECT /enseignants')
    })

    it('quitte le formulaire vers la fiche quand la photo échoue, sans second enregistrement possible', async () => {
      fsFactice.writeFile.mockRejectedValue(new Error('EACCES'))

      await expect(creerEnseignant({}, formulaire(SAISIE, PHOTO))).rejects.toThrow(
        'NEXT_REDIRECT /enseignants/ens-1?photo=echec'
      )
      expect(prismaFactice.enseignant.create).toHaveBeenCalledTimes(1)
      expect(erreurConsole).toHaveBeenCalled()
    })

    it('revient à la liste quand la photo est enregistrée', async () => {
      await expect(creerEnseignant({}, formulaire(SAISIE, PHOTO))).rejects.toThrow(
        'NEXT_REDIRECT /enseignants'
      )
      expect(prismaFactice.enseignant.update).toHaveBeenCalledWith({
        where: { id: 'ens-1' },
        data: { photoUrl: '/uploads/enseignants/ens-1.png' },
      })
    })
  })

  describe('modifierEnseignant', () => {
    it('annonce un doublon de matricule seulement pour une vraie violation d’unicité', async () => {
      prismaFactice.enseignant.update.mockRejectedValue(
        erreurPrisma('P2002', { target: ['matricule'] })
      )

      const etat = await modifierEnseignant('ens-1', {}, formulaire())

      expect(etat.message).toBe('Ce matricule existe déjà pour un autre enseignant.')
    })

    it('annonce un enseignant disparu (P2025), pas un doublon', async () => {
      prismaFactice.enseignant.update.mockRejectedValue(erreurPrisma('P2025'))

      const etat = await modifierEnseignant('ens-1', {}, formulaire())

      expect(etat.message).toMatch(/n'existe plus/)
      expect(etat.message).not.toMatch(/existe déjà/)
    })

    it('n’annonce PAS de doublon pour une erreur inattendue', async () => {
      prismaFactice.enseignant.update.mockRejectedValue(new Error('boum'))

      const etat = await modifierEnseignant('ens-1', {}, formulaire())

      expect(etat.message).toMatch(/erreur technique/i)
    })

    it('un échec de photo n’est plus pris pour un doublon : la fiche est ouverte avec un avertissement', async () => {
      fsFactice.writeFile.mockRejectedValue(new Error('EACCES'))

      await expect(modifierEnseignant('ens-1', {}, formulaire(SAISIE, PHOTO))).rejects.toThrow(
        'NEXT_REDIRECT /enseignants/ens-1?photo=echec'
      )
    })

    it('ouvre la fiche après une modification réussie', async () => {
      await expect(modifierEnseignant('ens-1', {}, formulaire())).rejects.toThrow(
        'NEXT_REDIRECT /enseignants/ens-1'
      )
    })
  })

  describe.each([
    [
      'marquerTransfere',
      (date: string) =>
        marquerTransfere(
          'ens-1',
          {},
          formulaire({ dateFinService: date, lieuTransfert: 'Douala' })
        ),
    ],
    [
      'marquerRetraite',
      (date: string) => marquerRetraite('ens-1', {}, formulaire({ dateFinService: date })),
    ],
  ])('%s : cohérence de la date de fin de service', (_nom, lancer) => {
    it('refuse une fin antérieure à la prise de service (le 01/09/2018), sans rien modifier', async () => {
      const etat = await lancer('1900-01-01')

      expect(etat.errors?.dateFinService).toEqual([
        'La date de fin de service ne peut pas précéder la prise de service (le 01/09/2018).',
      ])
      expect(prismaFactice.enseignant.update).not.toHaveBeenCalled()
    })

    it('accepte une fin le jour même de la prise de service', async () => {
      const etat = await lancer('2018-09-01')

      expect(etat.succes).toBe(true)
      expect(prismaFactice.enseignant.update).toHaveBeenCalledTimes(1)
    })

    it('annonce un enseignant disparu quand sa fiche n’existe plus', async () => {
      prismaFactice.enseignant.findUnique.mockResolvedValue(null)

      const etat = await lancer('2026-09-01')

      expect(etat.message).toMatch(/n'existe plus/)
      expect(prismaFactice.enseignant.update).not.toHaveBeenCalled()
    })
  })

  describe.each([
    [
      'marquerTransfere',
      () =>
        marquerTransfere(
          'ens-1',
          {},
          formulaire({ dateFinService: '2026-09-01', lieuTransfert: 'Douala' })
        ),
      /transféré/,
      'ACTIF',
    ],
    [
      'marquerRetraite',
      () => marquerRetraite('ens-1', {}, formulaire({ dateFinService: '2026-09-01' })),
      /retraité/,
      'ACTIF',
    ],
    [
      'reactiverEnseignant',
      () => reactiverEnseignant('ens-1', {}, formulaire({})),
      /réactivé/,
      'TRANSFERE',
    ],
  ])('%s', (_nom, lancer, succes, statutDeDepart) => {
    beforeEach(() => {
      prismaFactice.enseignant.findUnique.mockResolvedValue({
        id: 'ens-1',
        photoUrl: null,
        statut: statutDeDepart,
        datePriseService: new Date('2018-09-01'),
      })
    })

    it('annonce la réussite avec le drapeau « succes »', async () => {
      const etat = await lancer()

      expect(etat.message).toMatch(succes)
      expect(etat.succes).toBe(true)
    })

    it('annonce un enseignant disparu (P2025) au lieu d’afficher la page d’erreur', async () => {
      prismaFactice.enseignant.update.mockRejectedValue(erreurPrisma('P2025'))

      const etat = await lancer()

      expect(etat.message).toMatch(/n'existe plus/)
      expect(etat.succes).toBeUndefined()
    })

    it('annonce un enseignant disparu quand sa fiche a déjà été supprimée', async () => {
      prismaFactice.enseignant.findUnique.mockResolvedValue(null)

      const etat = await lancer()

      expect(etat.message).toMatch(/n'existe plus/)
      expect(etat.succes).toBeUndefined()
      expect(prismaFactice.enseignant.update).not.toHaveBeenCalled()
    })

    it('répond par un message technique, sans lever d’exception, pour une erreur inattendue', async () => {
      prismaFactice.enseignant.update.mockRejectedValue(new Error('boum'))

      const etat = await lancer()

      expect(etat.message).toMatch(/erreur technique/i)
      expect(etat.succes).toBeUndefined()
    })

    it('n’exécute rien sans session valide', async () => {
      exigerUtilisateur.mockRejectedValue(new Error('NEXT_REDIRECT /connexion'))

      await expect(lancer()).rejects.toThrow('NEXT_REDIRECT /connexion')
      expect(prismaFactice.enseignant.update).not.toHaveBeenCalled()
    })
  })

  describe('changements de statut : le statut enregistré décide', () => {
    const transferer = () =>
      marquerTransfere(
        'ens-1',
        {},
        formulaire({ dateFinService: '2026-09-01', lieuTransfert: 'Douala' })
      )
    const retraiter = () =>
      marquerRetraite('ens-1', {}, formulaire({ dateFinService: '2026-09-01' }))
    const reactiver = () => reactiverEnseignant('ens-1', {}, formulaire({}))

    const avecStatut = (statut: string) =>
      prismaFactice.enseignant.findUnique.mockResolvedValue({
        id: 'ens-1',
        photoUrl: null,
        statut,
        datePriseService: new Date('2018-09-01'),
      })

    it.each([
      ['un retraité', 'RETRAITE', transferer, /retraité : il ne peut pas être marqué transféré/],
      ['un transféré', 'TRANSFERE', transferer, /déjà transféré/],
      ['un transféré', 'TRANSFERE', retraiter, /transféré : il ne peut pas être marqué retraité/],
      ['un retraité', 'RETRAITE', retraiter, /déjà retraité/],
      ['un enseignant actif', 'ACTIF', reactiver, /déjà actif/],
    ])('refuse %s, sans rien écrire', async (_qui, statut, lancer, message) => {
      avecStatut(statut)

      const etat = await lancer()

      expect(etat.message).toMatch(message)
      expect(etat.succes).toBeUndefined()
      expect(prismaFactice.enseignant.update).not.toHaveBeenCalled()
      // Le message reste sous le formulaire : une fiche rechargée le ferait disparaître.
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('relit le statut et la date de prise de service avant d’écrire', async () => {
      avecStatut('ACTIF')

      await transferer()

      expect(prismaFactice.enseignant.findUnique).toHaveBeenCalledWith({
        where: { id: 'ens-1' },
        select: { statut: true, datePriseService: true },
      })
    })

    it('refuse le changement de statut avant de juger la date : le statut prime', async () => {
      avecStatut('RETRAITE')

      const etat = await marquerTransfere(
        'ens-1',
        {},
        formulaire({ dateFinService: '1900-01-01', lieuTransfert: 'Douala' })
      )

      expect(etat.errors).toBeUndefined()
      expect(etat.message).toMatch(/retraité/)
    })

    it('un transfert écrit le lieu de destination', async () => {
      avecStatut('ACTIF')

      await transferer()

      expect(prismaFactice.enseignant.update).toHaveBeenCalledWith({
        where: { id: 'ens-1' },
        data: {
          statut: 'TRANSFERE',
          dateFinService: new Date('2026-09-01'),
          lieuTransfert: 'Douala',
        },
      })
    })

    it('une mise à la retraite efface tout lieu de transfert resté dans la fiche', async () => {
      avecStatut('ACTIF')

      await retraiter()

      expect(prismaFactice.enseignant.update).toHaveBeenCalledWith({
        where: { id: 'ens-1' },
        data: { statut: 'RETRAITE', dateFinService: new Date('2026-09-01'), lieuTransfert: null },
      })
    })

    it.each(['TRANSFERE', 'RETRAITE'])(
      'la réactivation d’un enseignant %s efface la date de fin de service et le lieu de transfert',
      async (statut) => {
        avecStatut(statut)

        const etat = await reactiver()

        expect(etat.succes).toBe(true)
        expect(prismaFactice.enseignant.update).toHaveBeenCalledWith({
          where: { id: 'ens-1' },
          data: { statut: 'ACTIF', dateFinService: null, lieuTransfert: null },
        })
      }
    )

    it('ignore un champ « observations » envoyé par un ancien formulaire : il n’est jamais écrit', async () => {
      avecStatut('ACTIF')

      await marquerRetraite(
        'ens-1',
        {},
        formulaire({ dateFinService: '2026-09-01', observations: 'à retenir' })
      )

      const donnees = prismaFactice.enseignant.update.mock.calls[0]![0].data
      expect(Object.keys(donnees).sort()).toEqual(['dateFinService', 'lieuTransfert', 'statut'])
    })
  })
})
