import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base, le disque et Next.js sont simulés : on vérifie ce que chaque action répond à
// l'écran selon la nature de l'erreur, pas le moteur de la base.
const { exigerUtilisateur, fsFactice, prismaFactice } = vi.hoisted(() => ({
  exigerUtilisateur: vi.fn(),
  fsFactice: { mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() },
  prismaFactice: {
    etablissement: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    departement: { count: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('@/lib/auth', () => ({ exigerUtilisateur }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// Comme dans Next.js, redirect() interrompt l'exécution en levant une exception.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))
vi.mock('fs/promises', () => ({ default: fsFactice, ...fsFactice }))

const { creerEtablissement, modifierEtablissement, supprimerEtablissement, creerDepartement } =
  await import('./actions')

const erreurPrisma = (code: string, meta: Record<string, unknown> = {}) =>
  Object.assign(new Error(`erreur ${code}`), { name: 'PrismaClientKnownRequestError', code, meta })

const ETABLISSEMENT_ID = '3f2b8c1e-5a4d-4e6f-8a1b-2c3d4e5f6a7b'

type Photo = { size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> }
const PHOTO: Photo = { size: 3, type: 'image/png', arrayBuffer: async () => new ArrayBuffer(3) }

/** Un formulaire de test : seules les méthodes utilisées par les actions sont fournies. */
function formulaire(valeurs: Record<string, string> = {}, photo?: Photo) {
  return {
    [Symbol.iterator]: () => Object.entries(valeurs)[Symbol.iterator](),
    get: (cle: string) => (cle === 'photo' ? (photo ?? null) : (valeurs[cle] ?? null)),
  } as unknown as FormData
}

const SAISIE_ETABLISSEMENT = { nom: 'Faculté des Sciences', abreviation: 'fs', type: 'FACULTE' }
const SAISIE_DEPARTEMENT = {
  nom: 'Informatique',
  abreviation: 'info',
  etablissementId: ETABLISSEMENT_ID,
}

describe('actions établissements : erreurs de la base', () => {
  let erreurConsole: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.etablissement.create.mockResolvedValue({ id: 'etab-1' })
    prismaFactice.etablissement.findUnique.mockResolvedValue({ id: 'etab-1', photoUrl: null })
    prismaFactice.etablissement.update.mockResolvedValue({})
    prismaFactice.etablissement.delete.mockResolvedValue({})
    prismaFactice.departement.count.mockResolvedValue(0)
    prismaFactice.departement.create.mockResolvedValue({})
    fsFactice.mkdir.mockResolvedValue(undefined)
    fsFactice.writeFile.mockResolvedValue(undefined)
    fsFactice.unlink.mockResolvedValue(undefined)
    erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('creerEtablissement', () => {
    it('annonce « abréviation déjà utilisée » seulement pour une vraie violation d’unicité', async () => {
      prismaFactice.etablissement.create.mockRejectedValue(
        erreurPrisma('P2002', { target: ['abreviation'] })
      )

      const etat = await creerEtablissement({}, formulaire(SAISIE_ETABLISSEMENT))

      expect(etat.message).toBe('Cette abréviation est déjà utilisée par un autre établissement.')
    })

    it('n’annonce PAS de doublon quand la base est injoignable', async () => {
      prismaFactice.etablissement.create.mockRejectedValue(erreurPrisma('P1001'))

      const etat = await creerEtablissement({}, formulaire(SAISIE_ETABLISSEMENT))

      expect(etat.message).toMatch(/base de données est injoignable/)
      expect(etat.message).not.toMatch(/déjà utilisée/)
    })

    it('n’annonce PAS de doublon pour une erreur inattendue, et la journalise', async () => {
      prismaFactice.etablissement.create.mockRejectedValue(new Error('boum'))

      const etat = await creerEtablissement({}, formulaire(SAISIE_ETABLISSEMENT))

      expect(etat.message).toMatch(/erreur technique/i)
      expect(erreurConsole).toHaveBeenCalled()
    })

    it('revient à la liste après une création sans image', async () => {
      await expect(creerEtablissement({}, formulaire(SAISIE_ETABLISSEMENT))).rejects.toThrow(
        'NEXT_REDIRECT /etablissements'
      )
    })

    it('quitte le formulaire vers la fiche quand l’image échoue, sans second enregistrement possible', async () => {
      fsFactice.writeFile.mockRejectedValue(new Error('EACCES'))

      await expect(creerEtablissement({}, formulaire(SAISIE_ETABLISSEMENT, PHOTO))).rejects.toThrow(
        'NEXT_REDIRECT /etablissements/etab-1?photo=echec'
      )
      expect(prismaFactice.etablissement.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('modifierEtablissement', () => {
    it('annonce « abréviation déjà utilisée » seulement pour une vraie violation d’unicité', async () => {
      prismaFactice.etablissement.update.mockRejectedValue(erreurPrisma('P2002'))

      const etat = await modifierEtablissement('etab-1', {}, formulaire(SAISIE_ETABLISSEMENT))

      expect(etat.message).toBe('Cette abréviation est déjà utilisée par un autre établissement.')
    })

    it('annonce un établissement disparu (P2025), pas un doublon', async () => {
      prismaFactice.etablissement.update.mockRejectedValue(erreurPrisma('P2025'))

      const etat = await modifierEtablissement('etab-1', {}, formulaire(SAISIE_ETABLISSEMENT))

      expect(etat.message).toMatch(/n'existe plus/)
      expect(etat.message).not.toMatch(/déjà utilisée/)
    })

    it('un échec d’image n’est plus pris pour un doublon : la fiche est ouverte avec un avertissement', async () => {
      fsFactice.writeFile.mockRejectedValue(new Error('EACCES'))

      await expect(
        modifierEtablissement('etab-1', {}, formulaire(SAISIE_ETABLISSEMENT, PHOTO))
      ).rejects.toThrow('NEXT_REDIRECT /etablissements/etab-1?photo=echec')
    })

    it('ouvre la fiche après une modification réussie', async () => {
      await expect(
        modifierEtablissement('etab-1', {}, formulaire(SAISIE_ETABLISSEMENT))
      ).rejects.toThrow('NEXT_REDIRECT /etablissements/etab-1')
    })
  })

  describe('supprimerEtablissement', () => {
    it('refuse tant que des départements sont rattachés, sans supprimer', async () => {
      prismaFactice.departement.count.mockResolvedValue(2)

      const etat = await supprimerEtablissement('etab-1', {}, formulaire())

      expect(etat.message).toMatch(/2 département\(s\) rattaché\(s\)/)
      expect(prismaFactice.etablissement.delete).not.toHaveBeenCalled()
    })

    it('retourne à la liste après la suppression', async () => {
      await expect(supprimerEtablissement('etab-1', {}, formulaire())).rejects.toThrow(
        'NEXT_REDIRECT /etablissements'
      )
    })

    it('retourne simplement à la liste si l’établissement a déjà été supprimé (P2025)', async () => {
      prismaFactice.etablissement.delete.mockRejectedValue(erreurPrisma('P2025'))

      await expect(supprimerEtablissement('etab-1', {}, formulaire())).rejects.toThrow(
        'NEXT_REDIRECT /etablissements'
      )
    })

    it('explique un refus de la base (clé étrangère, P2003) au lieu d’afficher la page d’erreur', async () => {
      prismaFactice.etablissement.delete.mockRejectedValue(erreurPrisma('P2003'))

      const etat = await supprimerEtablissement('etab-1', {}, formulaire())

      expect(etat.message).toMatch(/Impossible de supprimer/)
    })

    it('répond par un message technique pour une erreur inattendue', async () => {
      prismaFactice.etablissement.delete.mockRejectedValue(new Error('boum'))

      const etat = await supprimerEtablissement('etab-1', {}, formulaire())

      expect(etat.message).toMatch(/erreur technique/i)
    })
  })

  describe('creerDepartement', () => {
    it('annonce la réussite avec le drapeau « succes »', async () => {
      const etat = await creerDepartement({}, formulaire(SAISIE_DEPARTEMENT))

      expect(etat).toEqual({ message: 'Département ajouté.', succes: true })
    })

    it('distingue un nom déjà pris d’une abréviation déjà prise', async () => {
      prismaFactice.departement.create.mockRejectedValueOnce(
        erreurPrisma('P2002', { target: ['etablissementId', 'nom'] })
      )
      prismaFactice.departement.create.mockRejectedValueOnce(
        erreurPrisma('P2002', { target: ['etablissementId', 'abreviation'] })
      )

      const parNom = await creerDepartement({}, formulaire(SAISIE_DEPARTEMENT))
      const parAbreviation = await creerDepartement({}, formulaire(SAISIE_DEPARTEMENT))

      expect(parNom.message).toMatch(/département de ce nom existe déjà/)
      expect(parAbreviation.message).toMatch(/abréviation est déjà utilisée/)
    })

    it('garde le message général quand la base n’indique pas le champ en cause', async () => {
      prismaFactice.departement.create.mockRejectedValue(erreurPrisma('P2002'))

      const etat = await creerDepartement({}, formulaire(SAISIE_DEPARTEMENT))

      expect(etat.message).toBe('Ce nom ou cette abréviation existe déjà pour cet établissement.')
    })

    it('n’annonce PAS de doublon quand la base est injoignable', async () => {
      prismaFactice.departement.create.mockRejectedValue(erreurPrisma('P1001'))

      const etat = await creerDepartement({}, formulaire(SAISIE_DEPARTEMENT))

      expect(etat.message).toMatch(/injoignable/)
      expect(etat.succes).toBeUndefined()
    })

    it('signale un établissement disparu (P2003)', async () => {
      prismaFactice.departement.create.mockRejectedValue(erreurPrisma('P2003'))

      const etat = await creerDepartement({}, formulaire(SAISIE_DEPARTEMENT))

      expect(etat.message).toMatch(/Cet établissement n'existe plus/)
    })
  })
})
