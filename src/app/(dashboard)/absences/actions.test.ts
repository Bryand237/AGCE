import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base et Next.js sont simulés : on vérifie ce que chaque action répond à l'écran selon
// la nature de l'erreur, pas le moteur de la base.
const { exigerUtilisateur, genererAttestationAbsence, prismaFactice, revalidatePath } = vi.hoisted(
  () => ({
    exigerUtilisateur: vi.fn(),
    revalidatePath: vi.fn(),
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
  })
)

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('@/lib/auth', () => ({ exigerUtilisateur }))
vi.mock('@/lib/documents/genererAttestationAbsence', () => ({ genererAttestationAbsence }))
vi.mock('next/cache', () => ({ revalidatePath }))
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

// Par défaut : une mission en cours, sans attestation (l'état où modifier, terminer et
// supprimer sont permis).
const ABSENCE_COMPLETE = {
  id: 'abs-1',
  type: 'MISSION',
  statut: 'EN_PERIODE',
  statutAttestation: null,
  dateDebut: new Date('2026-10-01'),
  enseignant: {
    departement: { etablissement: { id: 'etab-1' } },
  },
}

const MOTIF_MISSION = "Lieu d'accueil : Université de Douala\nObjet : Jury de soutenance de thèses"
const CONGE_AVEC_BROUILLON = { type: 'CONGE_MATERNITE', statutAttestation: 'EN_ATTENTE' }
const CONGE_SIGNE = { type: 'CONGE_MATERNITE', statutAttestation: 'VALIDEE' }

/**
 * Fait lire aux actions une absence dans l'état voulu : le serveur juge sur l'état enregistré.
 * Ne renvoie rien, exprès : `beforeEach(() => absenceEn(...))` renverrait la fonction simulée, que
 * Vitest prend pour une fonction de nettoyage et rappelle après le test (avec la promesse rejetée
 * d'un test d'échec de lecture, il le ferait échouer).
 */
const absenceEn = (etat: Record<string, unknown> = {}): void => {
  prismaFactice.absence.findUnique.mockResolvedValue({ ...ABSENCE_COMPLETE, ...etat })
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

    it('enregistre l’établissement d’accueil et l’objet d’une mission dans le motif', async () => {
      await expect(
        creerAbsence(
          {},
          formulaire({
            matricule: '12345',
            type: 'MISSION',
            dateDebut: '2026-10-01',
            dateFin: '2026-10-10',
            lieuAccueil: 'Université de Douala',
            objetMission: 'Jury de soutenance de thèses',
          })
        )
      ).rejects.toThrow('NEXT_REDIRECT /absences/abs-1')

      expect(prismaFactice.absence.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'MISSION', motif: MOTIF_MISSION }),
      })
    })

    it('laisse le motif d’un autre type d’absence tel qu’il est saisi', async () => {
      await expect(
        creerAbsence(
          {},
          formulaire({
            matricule: '12345',
            type: 'CONGE_MALADIE',
            dateDebut: '2026-10-01',
            dateFin: '2026-10-10',
            motif: 'Repos',
          })
        )
      ).rejects.toThrow('NEXT_REDIRECT')

      expect(prismaFactice.absence.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ motif: 'Repos' }),
      })
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
      { statut: 'EN_ATTENTE' },
    ],
    [
      'terminerAbsence',
      () => terminerAbsence('abs-1', {}, formulaire({ dateRetour: '2026-10-12' })),
      {},
    ],
    [
      'modifierAbsence',
      () =>
        modifierAbsence(
          'abs-1',
          {},
          formulaire({ dateDebut: '2026-10-01', dateFin: '2026-10-10' })
        ),
      {},
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
      CONGE_AVEC_BROUILLON,
    ],
  ])('%s', (_nom, lancer, etatDeDepart) => {
    beforeEach(() => absenceEn(etatDeDepart))

    it('annonce une absence disparue quand sa fiche a déjà été supprimée', async () => {
      prismaFactice.absence.findUnique.mockResolvedValue(null)

      const etat = await lancer()

      expect(etat.message).toMatch(/Cette absence n'existe plus/)
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    })

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

  describe('modifierAbsence : établissement d’accueil et objet d’une mission', () => {
    it('les recompose dans le motif et ne les envoie pas à la base comme colonnes', async () => {
      await modifierAbsence(
        'abs-1',
        {},
        formulaire({
          dateDebut: '2026-10-01',
          dateFin: '2026-10-10',
          lieuAccueil: 'Université de Douala',
          objetMission: 'Jury de soutenance de thèses',
        })
      )

      expect(prismaFactice.absence.update).toHaveBeenCalledWith({
        where: { id: 'abs-1' },
        data: {
          dateDebut: new Date('2026-10-01'),
          dateFin: new Date('2026-10-10'),
          motif: MOTIF_MISSION,
        },
      })
    })

    it('vide le motif quand les deux champs sont laissés vides', async () => {
      await modifierAbsence(
        'abs-1',
        {},
        formulaire({
          dateDebut: '2026-10-01',
          dateFin: '2026-10-10',
          lieuAccueil: ' ',
          objetMission: '',
        })
      )

      expect(prismaFactice.absence.update).toHaveBeenCalledWith({
        where: { id: 'abs-1' },
        data: expect.objectContaining({ motif: null }),
      })
    })
  })

  it('validerAttestation annonce la réussite avec le drapeau « succes »', async () => {
    absenceEn(CONGE_AVEC_BROUILLON)

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
    // La fiche de l'absence est rechargée : le formulaire de fin d'absence peut apparaître.
    expect(revalidatePath).toHaveBeenCalledWith('/absences/abs-1')
  })

  describe('validerAttestation : le document signé porte le numéro et la date', () => {
    const saisie = () =>
      formulaire({
        numeroDecision: ' 12/26 ',
        dateValidation: '2026-10-01',
        auteurValidation: 'Le Recteur',
      })

    it('refait l’attestation avec le numéro et la date saisis, et l’enregistre', async () => {
      absenceEn(CONGE_AVEC_BROUILLON)
      genererAttestationAbsence.mockReturnValue(Buffer.from('signee'))

      await validerAttestation('abs-1', {}, saisie())

      expect(genererAttestationAbsence).toHaveBeenCalledWith(
        'CONGE_MATERNITE',
        expect.objectContaining({ numeroDecision: '12/26', dateSignature: new Date('2026-10-01') })
      )
      expect(prismaFactice.absence.update).toHaveBeenCalledWith({
        where: { id: 'abs-1' },
        data: {
          decisionGeneree: new Uint8Array(Buffer.from('signee')),
          statutAttestation: 'VALIDEE',
          numeroDecision: '12/26',
          dateValidationAttestation: new Date('2026-10-01'),
          auteurValidationAttestation: 'Le Recteur',
        },
      })
    })

    it('refuse un numéro réduit à des espaces', async () => {
      absenceEn(CONGE_AVEC_BROUILLON)

      const etat = await validerAttestation(
        'abs-1',
        {},
        formulaire({
          numeroDecision: '   ',
          dateValidation: '2026-10-01',
          auteurValidation: 'Le Recteur',
        })
      )

      expect(etat.message).toMatch(/obligatoires/)
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    })

    it('ne signe rien quand le document ne peut pas être refait', async () => {
      absenceEn(CONGE_AVEC_BROUILLON)
      genererAttestationAbsence.mockImplementation(() => {
        throw new Error('Gabarit illisible.')
      })

      const etat = await validerAttestation('abs-1', {}, saisie())

      expect(etat).toEqual({ message: 'Gabarit illisible.' })
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    })

    it('ne signe pas une mission dont l’établissement d’accueil ou l’objet manque', async () => {
      absenceEn({ type: 'MISSION', statutAttestation: 'EN_ATTENTE', motif: null })

      const etat = await validerAttestation('abs-1', {}, saisie())

      expect(etat.message).toMatch(/l'établissement d'accueil et l'objet de la mission/)
      expect(genererAttestationAbsence).not.toHaveBeenCalled()
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    })

    it('répond que l’absence a disparu, sans rien refaire, si elle n’existe plus', async () => {
      prismaFactice.absence.findUnique.mockResolvedValue(null)

      const etat = await validerAttestation('abs-1', {}, saisie())

      expect(etat.message).toMatch(/n'existe plus/)
      expect(genererAttestationAbsence).not.toHaveBeenCalled()
    })

    it('le brouillon, lui, n’imprime ni numéro ni date', async () => {
      absenceEn({ type: 'CONGE_MATERNITE' })

      await genererAttestation('abs-1', {})

      const parametres = genererAttestationAbsence.mock.calls[0]![1]
      expect(parametres.numeroDecision).toBeUndefined()
      expect(parametres.dateSignature).toBeUndefined()
    })
  })

  describe('supprimerAbsence', () => {
    it('retourne à la liste après la suppression', async () => {
      await expect(supprimerAbsence('abs-1', {}, formulaire())).rejects.toThrow(
        'NEXT_REDIRECT /absences'
      )
      expect(prismaFactice.absence.delete).toHaveBeenCalledWith({ where: { id: 'abs-1' } })
    })

    it('retourne à la liste, sans rien supprimer, si l’absence a déjà disparu', async () => {
      prismaFactice.absence.findUnique.mockResolvedValue(null)

      await expect(supprimerAbsence('abs-1', {}, formulaire())).rejects.toThrow(
        'NEXT_REDIRECT /absences'
      )
      expect(prismaFactice.absence.delete).not.toHaveBeenCalled()
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
    beforeEach(() => absenceEn({ type: 'CONGE_MATERNITE' }))

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

    describe('pour une mission', () => {
      it('génère le brouillon quand l’établissement d’accueil et l’objet sont renseignés', async () => {
        absenceEn({ type: 'MISSION', motif: MOTIF_MISSION })

        const etat = await genererAttestation('abs-1', {})

        expect(etat).toEqual({ message: 'Brouillon généré.', succes: true })
        expect(genererAttestationAbsence).toHaveBeenCalledWith(
          'MISSION',
          expect.objectContaining({ absence: expect.objectContaining({ motif: MOTIF_MISSION }) })
        )
        expect(prismaFactice.absence.update).toHaveBeenCalledWith({
          where: { id: 'abs-1' },
          data: expect.objectContaining({ statutAttestation: 'EN_ATTENTE' }),
        })
      })

      it.each([
        [null, /l'établissement d'accueil et l'objet de la mission/],
        ['Objet : Jury de thèses', /l'établissement d'accueil de la mission/],
        ["Lieu d'accueil : Université de Douala", /l'objet de la mission/],
      ])('refuse sans rien générer quand le motif est %j', async (motif, message) => {
        absenceEn({ type: 'MISSION', motif })

        const etat = await genererAttestation('abs-1', {})

        expect(etat.message).toMatch(message)
        expect(etat.succes).toBeUndefined()
        expect(genererAttestationAbsence).not.toHaveBeenCalled()
        expect(prismaFactice.absence.update).not.toHaveBeenCalled()
        expect(revalidatePath).not.toHaveBeenCalled()
      })

      it('ne demande ni lieu ni objet pour un congé', async () => {
        absenceEn({ type: 'CONGE_MALADIE', motif: null })

        expect((await genererAttestation('abs-1', {})).succes).toBe(true)
      })
    })
  })
  describe('ordre des étapes : l’état enregistré décide', () => {
    const valider = () =>
      validerAbsence(
        'abs-1',
        {},
        formulaire({ dateValidation: '2026-10-01', auteurValidation: 'Le Recteur' })
      )
    const terminer = () => terminerAbsence('abs-1', {}, formulaire({ dateRetour: '2026-10-12' }))
    const modifier = () =>
      modifierAbsence('abs-1', {}, formulaire({ dateDebut: '2026-10-01', dateFin: '2026-10-10' }))
    const validerLAttestation = () =>
      validerAttestation(
        'abs-1',
        {},
        formulaire({
          numeroDecision: '12/26',
          dateValidation: '2026-10-01',
          auteurValidation: 'Le Recteur',
        })
      )

    it.each([
      ['valider une absence déjà validée', valider, {}, /déjà validée/],
      ['valider une absence terminée', valider, { statut: 'TERMINE' }, /terminée/],
      [
        'terminer une absence pas encore validée',
        terminer,
        { statut: 'EN_ATTENTE' },
        /pas encore validée/,
      ],
      ['terminer une absence déjà terminée', terminer, { statut: 'TERMINE' }, /déjà enregistré/],
      [
        'terminer un congé dont l’attestation n’est pas signée',
        terminer,
        CONGE_AVEC_BROUILLON,
        /après validation de l'attestation/,
      ],
      ['modifier une absence terminée', modifier, { statut: 'TERMINE' }, /terminée/],
      [
        'modifier une absence dont le brouillon d’attestation existe',
        modifier,
        CONGE_AVEC_BROUILLON,
        /brouillon d'attestation/,
      ],
      [
        'modifier une absence dont l’attestation est signée',
        modifier,
        CONGE_SIGNE,
        /attestation signée/,
      ],
      [
        'supprimer une absence dont l’attestation est signée',
        () => supprimerAbsence('abs-1', {}, formulaire()),
        CONGE_SIGNE,
        /ne peut pas être supprimée/,
      ],
      [
        'générer une attestation quand elle existe déjà',
        () => genererAttestation('abs-1', {}),
        CONGE_SIGNE,
        /existe déjà/,
      ],
      [
        'générer une attestation pour un type d’absence qui n’en a pas',
        () => genererAttestation('abs-1', {}),
        { type: 'CONGE_ADMINISTRATIF' },
        /n'a pas d'attestation/,
      ],
      [
        'générer l’attestation d’une mission sans établissement d’accueil ni objet',
        () => genererAttestation('abs-1', {}),
        { type: 'MISSION', motif: null },
        /l'établissement d'accueil et l'objet/,
      ],
      [
        'valider une attestation sans brouillon',
        validerLAttestation,
        { type: 'CONGE_MATERNITE' },
        /Générez d'abord le brouillon/,
      ],
      ['valider une attestation déjà signée', validerLAttestation, CONGE_SIGNE, /déjà validée/],
    ])('refuse de %s : message clair, aucune écriture', async (_nom, lancer, etat, message) => {
      absenceEn(etat)

      const reponse = await lancer()

      expect(reponse.message).toMatch(message)
      expect(reponse.succes).toBeUndefined()
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
      expect(prismaFactice.absence.delete).not.toHaveBeenCalled()
      // Le message doit rester sous le formulaire : une page rechargée le ferait disparaître.
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it.each([null, 'EN_ATTENTE', 'VALIDEE'])(
      'une mission peut être terminée sans attendre sa signature (attestation : %s)',
      async (statutAttestation) => {
        absenceEn({ type: 'MISSION', statutAttestation })

        const etat = await terminer()

        expect(etat.message).toBeUndefined()
        expect(prismaFactice.absence.update).toHaveBeenCalledTimes(1)
      }
    )

    it('un congé dont l’attestation est signée peut être terminé', async () => {
      absenceEn(CONGE_SIGNE)

      const etat = await terminer()

      expect(etat.message).toBeUndefined()
      expect(prismaFactice.absence.update).toHaveBeenCalledTimes(1)
    })

    it('un brouillon d’attestation peut encore être supprimé, une attestation signée jamais', async () => {
      absenceEn(CONGE_AVEC_BROUILLON)
      await expect(supprimerAbsence('abs-1', {}, formulaire())).rejects.toThrow(
        'NEXT_REDIRECT /absences'
      )
      expect(prismaFactice.absence.delete).toHaveBeenCalledTimes(1)
    })

    it('relit le statut, le type, l’attestation et le début de l’absence', async () => {
      absenceEn()

      await valider()

      expect(prismaFactice.absence.findUnique).toHaveBeenCalledWith({
        where: { id: 'abs-1' },
        select: { statut: true, type: true, statutAttestation: true, dateDebut: true },
      })
    })

    it('le statut prime sur la cohérence des dates : une absence terminée n’est pas rouverte', async () => {
      absenceEn({ statut: 'TERMINE' })

      const etat = await terminerAbsence('abs-1', {}, formulaire({ dateRetour: '2026-09-15' }))

      expect(etat.message).toBe('Le retour de cette absence est déjà enregistré.')
    })

    it('un double envoi de la validation ne valide qu’une fois', async () => {
      absenceEn({ statut: 'EN_ATTENTE' })
      expect((await valider()).message).toBeUndefined()

      // Le second envoi relit l'absence : elle est désormais en période.
      absenceEn({ statut: 'EN_PERIODE' })
      expect((await valider()).message).toBe('Cette absence est déjà validée.')

      expect(prismaFactice.absence.update).toHaveBeenCalledTimes(1)
    })
  })
})
