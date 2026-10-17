import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base et Next.js sont simulés : on vérifie ce que chaque action répond à l'écran selon
// la nature de l'erreur, pas le moteur de la base.
const { exigerUtilisateur, genererAttestationAbsence, prismaFactice } = vi.hoisted(() => ({
  exigerUtilisateur: vi.fn(),
  genererAttestationAbsence: vi.fn(),
  prismaFactice: {
    enseignant: { findUnique: vi.fn() },
    absence: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('@/lib/auth', () => ({ exigerUtilisateur }))
vi.mock('@/lib/documents/genererAttestationAbsence', () => ({ genererAttestationAbsence }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// Comme dans Next.js, redirect() interrompt l'exécution en levant une exception.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))

const {
  creerAbsence,
  validerAbsence,
  terminerAbsence,
  modifierAbsence,
  supprimerAbsence,
  genererAttestation,
  validerAttestation,
} = await import('./actions')

const erreurPrisma = (code: string, meta: Record<string, unknown> = {}) =>
  Object.assign(new Error(`erreur ${code}`), { name: 'PrismaClientKnownRequestError', code, meta })

/** Un formulaire de test : seules les méthodes utilisées par les actions sont fournies. */
function formulaire(valeurs: Record<string, string> = {}) {
  return {
    [Symbol.iterator]: () => Object.entries(valeurs)[Symbol.iterator](),
    get: (cle: string) => valeurs[cle] ?? null,
  } as unknown as FormData
}

const ABSENCE_COMPLETE = {
  id: 'abs-1',
  type: 'MISSION',
  dateDebut: new Date('2026-10-01'),
  enseignant: {
    departement: { etablissement: { id: 'etab-1' } },
  },
}

describe('actions absences : erreurs de la base', () => {
  let erreurConsole: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.enseignant.findUnique.mockResolvedValue({ id: 'ens-1', statut: 'ACTIF' })
    prismaFactice.absence.findFirst.mockResolvedValue(null)
    prismaFactice.absence.findUnique.mockResolvedValue(ABSENCE_COMPLETE)
    prismaFactice.absence.create.mockResolvedValue({ id: 'abs-1' })
    prismaFactice.absence.update.mockResolvedValue({})
    prismaFactice.absence.delete.mockResolvedValue({})
    genererAttestationAbsence.mockReturnValue(Buffer.from('docx'))
    erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('creerAbsence', () => {
    const saisie = () =>
      formulaire({
        matricule: '12345',
        type: 'MISSION',
        dateDebut: '2026-10-01',
        dateFin: '2026-10-10',
      })

    it('ouvre la fiche de l’absence créée', async () => {
      await expect(creerAbsence({}, saisie())).rejects.toThrow('NEXT_REDIRECT /absences/abs-1')
    })

    it('répond par un message, sans lever d’exception, quand la base est injoignable', async () => {
      prismaFactice.enseignant.findUnique.mockRejectedValue(erreurPrisma('P1001'))

      const etat = await creerAbsence({}, saisie())

      expect(etat.message).toMatch(/base de données est injoignable/)
    })

    it('répond par un message technique pour une erreur inattendue à l’enregistrement', async () => {
      prismaFactice.absence.create.mockRejectedValue(new Error('boum'))

      const etat = await creerAbsence({}, saisie())

      expect(etat.message).toMatch(/erreur technique/i)
      expect(erreurConsole).toHaveBeenCalled()
    })

    it('refuse une fin antérieure au début : erreur par champ ET message, sans toucher à la base', async () => {
      const etat = await creerAbsence(
        {},
        formulaire({
          matricule: '12345',
          type: 'MISSION',
          dateDebut: '2026-10-10',
          dateFin: '2026-10-01',
        })
      )

      expect(etat.errors?.dateFin).toEqual([
        'La date de fin ne peut pas précéder la date de début.',
      ])
      expect(etat.message).toBe('La date de fin ne peut pas précéder la date de début.')
      expect(prismaFactice.enseignant.findUnique).not.toHaveBeenCalled()
      expect(prismaFactice.absence.create).not.toHaveBeenCalled()
    })

    it('garde les messages métier existants', async () => {
      prismaFactice.enseignant.findUnique.mockResolvedValue(null)
      expect((await creerAbsence({}, saisie())).message).toBe('Aucun enseignant avec ce matricule.')

      prismaFactice.enseignant.findUnique.mockResolvedValue({ id: 'ens-1', statut: 'ACTIF' })
      prismaFactice.absence.findFirst.mockResolvedValue({ id: 'autre' })
      expect((await creerAbsence({}, saisie())).message).toBe(
        'Cet enseignant a déjà une absence en cours ou en attente.'
      )
    })
  })

  describe.each([
    [
      'validerAbsence',
      () =>
        validerAbsence(
          'abs-1',
          {},
          formulaire({ dateValidation: '2026-10-01', auteurValidation: 'Le Recteur' })
        ),
    ],
    [
      'terminerAbsence',
      () => terminerAbsence('abs-1', {}, formulaire({ dateRetour: '2026-10-12' })),
    ],
    [
      'modifierAbsence',
      () =>
        modifierAbsence(
          'abs-1',
          {},
          formulaire({ dateDebut: '2026-10-01', dateFin: '2026-10-10' })
        ),
    ],
    [
      'validerAttestation',
      () =>
        validerAttestation(
          'abs-1',
          {},
          formulaire({
            numeroDecision: '12/26',
            dateValidation: '2026-10-01',
            auteurValidation: 'Le Recteur',
          })
        ),
    ],
  ])('%s', (_nom, lancer) => {
    it('réussit quand la base répond', async () => {
      const etat = await lancer()

      expect(etat.errors).toBeUndefined()
      expect(prismaFactice.absence.update).toHaveBeenCalledTimes(1)
    })

    it('annonce une absence disparue (P2025) au lieu d’afficher la page d’erreur', async () => {
      prismaFactice.absence.update.mockRejectedValue(erreurPrisma('P2025'))

      const etat = await lancer()

      expect(etat.message).toMatch(/Cette absence n'existe plus/)
      expect(etat.succes).toBeUndefined()
    })

    it('répond par un message technique, sans lever d’exception, pour une erreur inattendue', async () => {
      prismaFactice.absence.update.mockRejectedValue(new Error('boum'))

      const etat = await lancer()

      expect(etat.message).toMatch(/erreur technique/i)
      expect(erreurConsole).toHaveBeenCalled()
    })
  })

  describe('terminerAbsence : cohérence de la date de retour', () => {
    it('refuse un retour antérieur au début de l’absence (le 01/10/2026), sans rien modifier', async () => {
      const etat = await terminerAbsence('abs-1', {}, formulaire({ dateRetour: '2026-09-15' }))

      expect(etat.message).toBe(
        "La date de retour ne peut pas précéder le début de l'absence (le 01/10/2026)."
      )
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    })

    it('accepte un retour anticipé, avant la fin prévue', async () => {
      const etat = await terminerAbsence('abs-1', {}, formulaire({ dateRetour: '2026-10-02' }))

      expect(etat.message).toBeUndefined()
      expect(prismaFactice.absence.update).toHaveBeenCalledTimes(1)
    })

    it('annonce une absence disparue quand elle n’existe plus', async () => {
      prismaFactice.absence.findUnique.mockResolvedValue(null)

      const etat = await terminerAbsence('abs-1', {}, formulaire({ dateRetour: '2026-10-12' }))

      expect(etat.message).toMatch(/Cette absence n'existe plus/)
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    })

    it('demande une date de retour lisible, en français', async () => {
      const etat = await terminerAbsence('abs-1', {}, formulaire({ dateRetour: '' }))

      expect(etat.message).toBe('La date de retour est invalide ou absente.')
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    })
  })

  describe('modifierAbsence : cohérence des dates', () => {
    it('refuse une fin antérieure au début, sans rien modifier', async () => {
      const etat = await modifierAbsence(
        'abs-1',
        {},
        formulaire({ dateDebut: '2026-10-10', dateFin: '2026-10-01' })
      )

      expect(etat.message).toBe('La date de fin ne peut pas précéder la date de début.')
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    })

    it('enregistre les dates et un motif vide devient null', async () => {
      await modifierAbsence(
        'abs-1',
        {},
        formulaire({ dateDebut: '2026-10-01', dateFin: '2026-10-10', motif: '  ' })
      )

      expect(prismaFactice.absence.update).toHaveBeenCalledWith({
        where: { id: 'abs-1' },
        data: {
          dateDebut: new Date('2026-10-01'),
          dateFin: new Date('2026-10-10'),
          motif: null,
        },
      })
    })
  })

  it('validerAttestation annonce la réussite avec le drapeau « succes »', async () => {
    const etat = await validerAttestation(
      'abs-1',
      {},
      formulaire({
        numeroDecision: '12/26',
        dateValidation: '2026-10-01',
        auteurValidation: 'Le Recteur',
      })
    )

    expect(etat).toEqual({ message: 'Attestation validée.', succes: true })
  })

  describe('supprimerAbsence', () => {
    it('retourne à la liste après la suppression', async () => {
      await expect(supprimerAbsence('abs-1', {}, formulaire())).rejects.toThrow(
        'NEXT_REDIRECT /absences'
      )
      expect(prismaFactice.absence.delete).toHaveBeenCalledWith({ where: { id: 'abs-1' } })
    })

    it('retourne simplement à la liste si l’absence a déjà été supprimée (P2025)', async () => {
      prismaFactice.absence.delete.mockRejectedValue(erreurPrisma('P2025'))

      await expect(supprimerAbsence('abs-1', {}, formulaire())).rejects.toThrow(
        'NEXT_REDIRECT /absences'
      )
    })

    it('reste sur la fiche avec un message pour tout autre échec', async () => {
      prismaFactice.absence.delete.mockRejectedValue(erreurPrisma('P1001'))

      const etat = await supprimerAbsence('abs-1', {}, formulaire())

      expect(etat.message).toMatch(/base de données est injoignable/)
    })
  })

  describe('genererAttestation', () => {
    it('génère le brouillon et annonce la réussite', async () => {
      const etat = await genererAttestation('abs-1', {})

      expect(etat).toEqual({ message: 'Brouillon généré.', succes: true })
    })

    it('répond par un message quand la lecture de l’absence échoue', async () => {
      prismaFactice.absence.findUnique.mockRejectedValue(erreurPrisma('P1001'))

      const etat = await genererAttestation('abs-1', {})

      expect(etat.message).toMatch(/injoignable/)
    })

    it('répond par un message quand l’enregistrement du brouillon échoue', async () => {
      prismaFactice.absence.update.mockRejectedValue(erreurPrisma('P2025'))

      const etat = await genererAttestation('abs-1', {})

      expect(etat.message).toMatch(/Cette absence n'existe plus/)
      expect(etat.succes).toBeUndefined()
    })
  })
})
