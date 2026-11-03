import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base est simulée : on vérifie ici ce que l'action demande à Prisma (quelles
// suppressions, dans quel ordre, dans une transaction) et ce qu'elle répond à
// l'écran. Le comportement réel des clés étrangères se contrôle sur la base.
const { exigerUtilisateur, genererDecisionFactice, journal, prismaFactice, tx } = vi.hoisted(() => {
  const journal: string[] = []
  const tracer = (nom: string) =>
    vi.fn(async () => {
      journal.push(nom)
    })

  const tx = {
    enseignant: {
      update: tracer('enseignant.update'),
      updateMany: tracer('enseignant.updateMany'),
      findUnique: vi.fn(),
    },
    selectionAvancement: {
      deleteMany: tracer('selection.deleteMany'),
      delete: vi.fn(),
      update: vi.fn(),
    },
    historiqueAvancement: {
      deleteMany: tracer('historique.deleteMany'),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: tracer('historique.updateMany'),
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
    },
    sessionConseil: {
      delete: tracer('rapport.delete'),
      update: tracer('rapport.update'),
      findUnique: vi.fn(),
    },
  }
  const prismaFactice = {
    sessionConseil: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    selectionAvancement: { findUnique: vi.fn() },
    echelonIndiciaire: { findUnique: vi.fn(), findMany: vi.fn() },
    enseignant: { findUnique: vi.fn(), findMany: vi.fn() },
    historiqueAvancement: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  }
  return {
    exigerUtilisateur: vi.fn(),
    genererDecisionFactice: vi.fn(),
    journal,
    prismaFactice,
    tx,
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
// La session est testée à part (auth-session.test.ts et actions-protegees.test.ts) :
// ici, l'utilisateur est simplement connecté.
vi.mock('@/lib/auth', () => ({ exigerUtilisateur }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// Comme dans Next.js, redirect() interrompt l'exécution en levant une exception.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))
vi.mock('@/lib/documents/genererDecisionAvancement', () => ({
  genererDecisionAvancement: genererDecisionFactice,
}))

const {
  creerRapport,
  genererDecision,
  mettreAJourMetadonneesSession,
  mettreAJourRapport,
  modifierSelection,
  retirerSelection,
  supprimerRapport,
  validerDecision,
  validerRapport,
} = await import('./actions')

const RAPPORT = 'r-1'

function rapportBrouillon(surcharge: Record<string, unknown> = {}) {
  return { id: RAPPORT, statut: 'BROUILLON', avancements: [], ...surcharge }
}

describe('supprimerRapport', () => {
  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
  })

  it('supprime les sélections avant le rapport, dans une seule transaction, puis revient à la liste', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(rapportBrouillon())

    await expect(supprimerRapport(RAPPORT, {}, new FormData())).rejects.toThrow(
      'NEXT_REDIRECT /avancements?msg=rapport_supprime'
    )

    expect(prismaFactice.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.selectionAvancement.deleteMany).toHaveBeenCalledWith({
      where: { rapportId: RAPPORT },
    })
    // L'ordre compte : la base refuse de supprimer un rapport tant qu'une sélection y renvoie.
    expect(journal).toEqual(['selection.deleteMany', 'historique.deleteMany', 'rapport.delete'])
  })

  it('répond par un message lisible, sans quitter la page, si la suppression échoue', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(rapportBrouillon())
    prismaFactice.$transaction.mockRejectedValue(new Error('violation de clé étrangère'))
    const erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})

    const etat = await supprimerRapport(RAPPORT, {}, new FormData())

    expect(etat.message).toMatch(/La suppression a échoué/)
    expect(etat.message).toMatch(/n'a pas été modifié/)
    expect(erreurConsole).toHaveBeenCalled()
    erreurConsole.mockRestore()
  })

  it('refuse de supprimer un rapport validé, sans toucher à la base', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(
      rapportBrouillon({ statut: 'VALIDE' })
    )

    const etat = await supprimerRapport(RAPPORT, {}, new FormData())

    expect(etat.message).toBe('Un rapport validé ne peut pas être supprimé.')
    expect(prismaFactice.$transaction).not.toHaveBeenCalled()
  })

  it('exige une session avant de lire quoi que ce soit dans la base', async () => {
    exigerUtilisateur.mockRejectedValue(new Error('NEXT_REDIRECT /connexion'))

    await expect(supprimerRapport(RAPPORT, {}, new FormData())).rejects.toThrow(
      'NEXT_REDIRECT /connexion'
    )
    expect(prismaFactice.sessionConseil.findUnique).not.toHaveBeenCalled()
    expect(prismaFactice.$transaction).not.toHaveBeenCalled()
  })

  it('revient simplement à la liste si le rapport n’existe plus', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(null)

    await expect(supprimerRapport(RAPPORT, {}, new FormData())).rejects.toThrow(
      'NEXT_REDIRECT /avancements'
    )
    expect(prismaFactice.$transaction).not.toHaveBeenCalled()
  })
})

function donnees(valeurs: Record<string, string>) {
  const formData = new FormData()
  for (const [cle, valeur] of Object.entries(valeurs)) formData.set(cle, valeur)
  return formData
}

describe('rapports : cohérence de la période', () => {
  const PERIODE = { numero: '55ème', periodeDebut: '2025-07-01', periodeFin: '2025-12-31' }
  // Le brouillon enregistré : une période identique ne déclenche aucun contrôle de chevauchement.
  const RAPPORT_EXISTANT = {
    statut: 'BROUILLON',
    periodeDebut: new Date('2025-01-01'),
    periodeFin: new Date('2025-06-30'),
  }
  const INVERSEE = { ...PERIODE, periodeDebut: '2025-12-31', periodeFin: '2025-07-01' }

  beforeEach(() => {
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(RAPPORT_EXISTANT)
    prismaFactice.sessionConseil.findMany.mockResolvedValue([])
    prismaFactice.sessionConseil.updateMany.mockResolvedValue({ count: 1 })
  })

  it('creerRapport refuse une période inversée : message et erreur par champ, sans toucher à la base', async () => {
    const etat = await creerRapport({}, donnees(INVERSEE))

    expect(etat.message).toBe('La fin de période ne peut pas précéder son début.')
    expect(etat.errors?.periodeFin).toEqual(['La fin de période ne peut pas précéder son début.'])
  })

  it('creerRapport refuse une édition réduite à des espaces', async () => {
    const etat = await creerRapport({}, donnees({ ...PERIODE, numero: '   ' }))

    expect(etat.message).toBe("L'édition (numéro de session) est obligatoire.")
  })

  it('mettreAJourRapport refuse une période inversée, sans rien modifier', async () => {
    const etat = await mettreAJourRapport(RAPPORT, {}, donnees(INVERSEE))

    expect(etat.message).toBe('La fin de période ne peut pas précéder son début.')
    expect(etat.succes).toBeUndefined()
    expect(prismaFactice.sessionConseil.updateMany).not.toHaveBeenCalled()
  })

  it('mettreAJourRapport enregistre une période cohérente et annonce la réussite', async () => {
    const etat = await mettreAJourRapport(RAPPORT, {}, donnees({ ...PERIODE, numero: ' 55ème ' }))

    expect(etat.succes).toBe(true)
    expect(prismaFactice.sessionConseil.updateMany).toHaveBeenCalledWith({
      where: { id: RAPPORT, statut: { not: 'VALIDE' } },
      data: {
        numero: '55ème',
        periodeDebut: new Date('2025-07-01'),
        periodeFin: new Date('2025-12-31'),
      },
    })
  })

  it('validerDecision affiche un message (et non une erreur invisible) pour un numéro réduit à des espaces', async () => {
    const etat = await validerDecision(
      'avancement-1',
      {},
      donnees({
        numeroDecision: '   ',
        dateValidation: '2026-02-01',
        auteurValidation: 'Le Recteur',
      })
    )

    expect(etat.message).toBe('Le numéro de décision est obligatoire')
    expect(etat.errors?.numeroDecision).toBeDefined()
  })
})

// ---------------------------------------------------------------------------------------
// A2 : la position d'un avancement reste dans le grade et la voie de l'enseignant, et
// chaque écriture de position fixe le grade dans la même requête.

const position = (id: string, grade: string, voie: string, ordre: number) => ({
  id,
  grade,
  voie,
  ordre,
})
const A1 = position('pos-a1', 'ASSISTANT', 'SANS_THESE', 1)
const A2 = position('pos-a2', 'ASSISTANT', 'SANS_THESE', 2)
const A3 = position('pos-a3', 'ASSISTANT', 'SANS_THESE', 3)
const A5 = position('pos-a5', 'ASSISTANT', 'SANS_THESE', 5)
const A_AVEC_THESE = position('pos-at', 'ASSISTANT', 'AVEC_THESE', 6)
const PROFESSEUR = position('pos-p', 'PROFESSEUR', 'AUCUNE', 9)

const PERIODE_FIN = new Date('2025-12-31')
const ANCIEN_EFFET = new Date('2023-07-01')

function formulairePosition(positionProposeeId: string) {
  return donnees({ positionProposeeId })
}

describe('modifierSelection : position proposée', () => {
  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
    prismaFactice.sessionConseil.findUnique.mockResolvedValue({
      id: RAPPORT,
      statut: 'BROUILLON',
      periodeFin: PERIODE_FIN,
    })
    prismaFactice.selectionAvancement.findUnique.mockResolvedValue({
      id: 'sel-1',
      rapportId: RAPPORT,
      enseignantId: 'ens-1',
    })
    prismaFactice.enseignant.findUnique.mockResolvedValue({
      id: 'ens-1',
      positionActuelleId: A2.id,
      positionActuelle: A2,
    })
  })

  describe('rapport en brouillon', () => {
    it('refuse un autre grade (Assistant proposé vers Professeur), sans rien écrire', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(PROFESSEUR)

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(PROFESSEUR.id))

      expect(etat.message).toMatch(/rester dans le grade de l'enseignant \(Assistant\)/)
      expect(prismaFactice.$transaction).not.toHaveBeenCalled()
    })

    it('refuse une autre voie du même grade', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A_AVEC_THESE)

      const etat = await modifierSelection(
        RAPPORT,
        'sel-1',
        {},
        formulairePosition(A_AVEC_THESE.id)
      )

      expect(etat.message).toMatch(/même voie/)
      expect(prismaFactice.$transaction).not.toHaveBeenCalled()
    })

    it.each([
      ['la position actuelle elle-même', A2],
      ['une position inférieure', A1],
    ])('refuse %s', async (_libelle, proposee) => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(proposee)

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(proposee.id))

      expect(etat.message).toMatch(/supérieure/)
      expect(prismaFactice.$transaction).not.toHaveBeenCalled()
    })

    it('accepte de franchir plusieurs paliers, et ne touche pas à la fiche de l’enseignant', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A5)

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(A5.id))

      expect(etat.message).toBe('Position proposée mise à jour.')
      expect(tx.selectionAvancement.update).toHaveBeenCalledWith({
        where: { id: 'sel-1' },
        data: { positionProposeeId: A5.id },
      })
      expect(tx.enseignant.update).not.toHaveBeenCalled()
      expect(tx.historiqueAvancement.update).not.toHaveBeenCalled()
    })
  })

  describe('rapport validé', () => {
    const historique = (surcharge: Record<string, unknown> = {}) => ({
      id: 'h-1',
      statutDecision: null,
      anciennePosition: A2,
      nouvellePositionId: A3.id,
      ...surcharge,
    })

    beforeEach(() => {
      prismaFactice.sessionConseil.findUnique.mockResolvedValue({
        id: RAPPORT,
        statut: 'VALIDE',
        periodeFin: PERIODE_FIN,
      })
      // Après la validation, la fiche porte la position issue du rapport.
      prismaFactice.enseignant.findUnique.mockResolvedValue({
        id: 'ens-1',
        positionActuelleId: A3.id,
        positionActuelle: A3,
      })
      prismaFactice.historiqueAvancement.findFirst.mockResolvedValue(historique())
    })

    it('refuse quand l’historique de l’avancement est introuvable', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A5)
      prismaFactice.historiqueAvancement.findFirst.mockResolvedValue(null)

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(A5.id))

      expect(etat.message).toMatch(/historique de cet avancement est introuvable/)
      expect(prismaFactice.$transaction).not.toHaveBeenCalled()
    })

    it.each(['EN_ATTENTE', 'VALIDEE'])(
      'refuse quand la décision est déjà générée (« %s »)',
      async (statutDecision) => {
        prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A5)
        prismaFactice.historiqueAvancement.findFirst.mockResolvedValue(
          historique({ statutDecision })
        )

        const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(A5.id))

        expect(etat.message).toMatch(/décision a déjà été générée/)
        expect(prismaFactice.$transaction).not.toHaveBeenCalled()
      }
    )

    it('refuse quand l’enseignant a avancé depuis : sa position actuelle ne doit pas être écrasée', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A5)
      prismaFactice.enseignant.findUnique.mockResolvedValue({
        id: 'ens-1',
        positionActuelleId: A5.id,
        positionActuelle: A5,
      })

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(A5.id))

      expect(etat.message).toMatch(/a changé de position depuis/)
      expect(prismaFactice.$transaction).not.toHaveBeenCalled()
    })

    it('juge la position à partir de celle d’AVANT l’avancement : refuse de ne pas avancer', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A2)

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(A2.id))

      expect(etat.message).toMatch(/supérieure/)
      expect(prismaFactice.$transaction).not.toHaveBeenCalled()
    })

    it('refuse un autre grade', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(PROFESSEUR)

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(PROFESSEUR.id))

      expect(etat.message).toMatch(/rester dans le grade/)
      expect(tx.enseignant.update).not.toHaveBeenCalled()
    })

    it('met à jour la proposition, l’historique et la fiche, grade compris, dans une transaction', async () => {
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A5)

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(A5.id))

      expect(etat.message).toBe('Position proposée mise à jour.')
      expect(prismaFactice.$transaction).toHaveBeenCalledTimes(1)
      expect(tx.selectionAvancement.update).toHaveBeenCalledWith({
        where: { id: 'sel-1' },
        data: { positionProposeeId: A5.id },
      })
      expect(tx.historiqueAvancement.update).toHaveBeenCalledWith({
        where: { id: 'h-1' },
        data: { nouvellePositionId: A5.id },
      })
      expect(tx.enseignant.update).toHaveBeenCalledWith({
        where: { id: 'ens-1' },
        data: { positionActuelleId: A5.id, grade: 'ASSISTANT', dateEffetEchelon: PERIODE_FIN },
      })
    })
  })
})

describe('écritures de la position : le grade suit', () => {
  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
  })

  it('retirerSelection (rapport validé) rétablit la position ET le grade d’avant', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue({ id: RAPPORT, statut: 'VALIDE' })
    prismaFactice.selectionAvancement.findUnique.mockResolvedValue({ id: 'sel-1' })
    tx.historiqueAvancement.findFirst.mockResolvedValue({
      id: 'h-1',
      anciennePositionId: A2.id,
      anciennePosition: A2,
      nouvellePositionId: A3.id,
      dateAncienEffet: ANCIEN_EFFET,
    })
    tx.enseignant.findUnique.mockResolvedValue({ positionActuelleId: A3.id })

    await retirerSelection(RAPPORT, 'ens-1')

    expect(tx.enseignant.update).toHaveBeenCalledWith({
      where: { id: 'ens-1' },
      data: { positionActuelleId: A2.id, grade: 'ASSISTANT', dateEffetEchelon: ANCIEN_EFFET },
    })
  })

  it('supprimerRapport rétablit la position ET le grade d’avant pour un avancement resté en base', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue({
      id: RAPPORT,
      statut: 'BROUILLON',
      avancements: [
        {
          enseignantId: 'ens-1',
          anciennePositionId: A2.id,
          anciennePosition: A2,
          nouvellePositionId: A3.id,
          dateAncienEffet: ANCIEN_EFFET,
          enseignant: { positionActuelleId: A3.id },
        },
      ],
    })

    await expect(supprimerRapport(RAPPORT, {}, new FormData())).rejects.toThrow(
      'NEXT_REDIRECT /avancements?msg=rapport_supprime'
    )

    expect(tx.enseignant.update).toHaveBeenCalledWith({
      where: { id: 'ens-1' },
      data: { positionActuelleId: A2.id, grade: 'ASSISTANT', dateEffetEchelon: ANCIEN_EFFET },
    })
  })
})

// ---------------------------------------------------------------------------------------
// A4 : la validation relit les enseignants et ne laisse personne de côté en silence.

/** Une sélection telle que la lit validerRapport : l'enseignant avec sa position actuelle. */
function selectionAValider(
  numero: number,
  surcharge: {
    statut?: string
    actuelle?: ReturnType<typeof position>
    proposee?: ReturnType<typeof position>
  } = {}
) {
  const { statut = 'ACTIF', actuelle = A2, proposee = A3 } = surcharge
  return {
    id: `sel-${numero}`,
    enseignantId: `ens-${numero}`,
    positionProposeeId: proposee.id,
    positionProposee: proposee,
    enseignant: {
      nom: `NOM${numero}`,
      prenom: 'Alice',
      matricule: `M-${numero}`,
      statut,
      positionActuelleId: actuelle.id,
      positionActuelle: actuelle,
      dateEffetEchelon: ANCIEN_EFFET,
    },
  }
}

describe('validerRapport : sélections périmées', () => {
  const valider = (extra: Record<string, string> = {}) =>
    validerRapport(
      RAPPORT,
      {},
      donnees({ dateValidation: '2026-01-10', auteurValidation: 'Le Recteur', ...extra })
    )

  function rapportAvec(selections: ReturnType<typeof selectionAValider>[], statut = 'BROUILLON') {
    tx.sessionConseil.findUnique.mockResolvedValue({
      id: RAPPORT,
      statut,
      periodeFin: PERIODE_FIN,
      selections,
    })
  }

  /** Rien n'a été écrit : ni avancement, ni fiche, ni retrait de sélection, ni validation. */
  function rienNEstEcrit() {
    expect(tx.historiqueAvancement.createMany).not.toHaveBeenCalled()
    expect(tx.enseignant.update).not.toHaveBeenCalled()
    expect(tx.selectionAvancement.deleteMany).not.toHaveBeenCalled()
    expect(tx.sessionConseil.update).not.toHaveBeenCalled()
  }

  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
  })

  it('valide tout le monde quand les sélections sont d’actualité, grade compris', async () => {
    rapportAvec([selectionAValider(1), selectionAValider(2)])

    await expect(valider()).rejects.toThrow(
      `NEXT_REDIRECT /avancements/${RAPPORT}?msg=rapport_valide`
    )

    expect(tx.historiqueAvancement.createMany).toHaveBeenCalledTimes(1)
    expect(tx.historiqueAvancement.createMany).toHaveBeenCalledWith({
      data: [1, 2].map((n) => ({
        enseignantId: `ens-${n}`,
        sessionId: RAPPORT,
        anciennePositionId: A2.id,
        dateAncienEffet: ANCIEN_EFFET,
        nouvellePositionId: A3.id,
        dateNouvelEffet: PERIODE_FIN,
      })),
    })
    expect(tx.enseignant.update).toHaveBeenCalledWith({
      where: { id: 'ens-1' },
      data: { positionActuelleId: A3.id, grade: 'ASSISTANT', dateEffetEchelon: PERIODE_FIN },
    })
    expect(tx.selectionAvancement.deleteMany).not.toHaveBeenCalled()
    expect(tx.sessionConseil.update).toHaveBeenCalledWith({
      where: { id: RAPPORT },
      data: expect.objectContaining({ statut: 'VALIDE', auteurValidation: 'Le Recteur' }),
    })
  })

  it('relit le rapport et les enseignants dans la transaction qui valide', async () => {
    rapportAvec([selectionAValider(1)])

    await expect(valider()).rejects.toThrow('NEXT_REDIRECT')

    expect(prismaFactice.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.sessionConseil.findUnique).toHaveBeenCalledTimes(1)
    expect(prismaFactice.sessionConseil.findUnique).not.toHaveBeenCalled()
  })

  it('signale un enseignant devenu retraité, sans rien valider avant confirmation', async () => {
    rapportAvec([selectionAValider(1), selectionAValider(2, { statut: 'RETRAITE' })])

    const etat = await valider()

    expect(etat.exclusions).toEqual([
      {
        enseignantId: 'ens-2',
        nom: 'NOM2 Alice',
        matricule: 'M-2',
        motif: expect.stringMatching(/retraité/),
      },
    ])
    expect(etat.peutConfirmer).toBe(true)
    expect(etat.message).toMatch(/Rien n’a encore été validé/)
    rienNEstEcrit()
  })

  it('signale une proposition qui ne dépasse plus la position actuelle (second rapport pour la même période)', async () => {
    rapportAvec([selectionAValider(1), selectionAValider(2, { actuelle: A3, proposee: A3 })])

    const etat = await valider()

    expect(etat.exclusions?.map((e) => e.enseignantId)).toEqual(['ens-2'])
    expect(etat.exclusions?.[0]?.motif).toMatch(/position a changé/)
    rienNEstEcrit()
  })

  it('une fois confirmée, fait avancer les autres et retire les exclus du rapport', async () => {
    rapportAvec([selectionAValider(1), selectionAValider(2, { statut: 'TRANSFERE' })])

    await expect(valider({ exclusionsConfirmees: 'ens-2' })).rejects.toThrow(
      `NEXT_REDIRECT /avancements/${RAPPORT}?msg=rapport_valide`
    )

    expect(tx.historiqueAvancement.createMany).toHaveBeenCalledTimes(1)
    expect(tx.historiqueAvancement.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ enseignantId: 'ens-1', nouvellePositionId: A3.id })],
    })
    expect(tx.enseignant.update).toHaveBeenCalledTimes(1)
    expect(tx.selectionAvancement.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['sel-2'] } },
    })
    expect(tx.sessionConseil.update).toHaveBeenCalledTimes(1)
  })

  it('refuse une confirmation qui ne couvre pas tous les exclus d’aujourd’hui', async () => {
    // Le second enseignant est devenu retraité après que l'utilisateur a confirmé la liste.
    rapportAvec([
      selectionAValider(1),
      selectionAValider(2, { statut: 'RETRAITE' }),
      selectionAValider(3, { statut: 'RETRAITE' }),
    ])

    const etat = await valider({ exclusionsConfirmees: 'ens-2' })

    expect(etat.exclusions?.map((e) => e.enseignantId)).toEqual(['ens-2', 'ens-3'])
    expect(etat.peutConfirmer).toBe(true)
    rienNEstEcrit()
  })

  it('ne valide rien, même confirmé, quand plus aucun enseignant ne peut avancer', async () => {
    rapportAvec([
      selectionAValider(1, { statut: 'RETRAITE' }),
      selectionAValider(2, { statut: 'TRANSFERE' }),
    ])

    const etat = await valider({ exclusionsConfirmees: 'ens-1,ens-2' })

    expect(etat.message).toMatch(/Aucun enseignant de ce rapport ne peut plus avancer/)
    expect(etat.exclusions).toHaveLength(2)
    expect(etat.peutConfirmer).toBe(false)
    rienNEstEcrit()
  })

  it('garde les refus existants : rapport introuvable, déjà validé, sans sélection', async () => {
    tx.sessionConseil.findUnique.mockResolvedValue(null)
    expect((await valider()).message).toBe('Rapport introuvable.')

    rapportAvec([selectionAValider(1)], 'VALIDE')
    expect((await valider()).message).toBe('Ce rapport est déjà validé.')

    rapportAvec([])
    expect((await valider()).message).toBe('Aucun enseignant sélectionné.')
    rienNEstEcrit()
  })

  it('exige la date et l’auteur avant de lire quoi que ce soit', async () => {
    const etat = await validerRapport(
      RAPPORT,
      {},
      donnees({ dateValidation: '', auteurValidation: '' })
    )

    expect(etat.message).toBe('Date et auteur de la validation sont obligatoires.')
    expect(prismaFactice.$transaction).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------------------
// A4 (2/2) : avertir à la création quand un autre brouillon couvre la même période.

describe('creerRapport : brouillon sur la même période', () => {
  const PERIODE = { numero: '56ème', periodeDebut: '2026-01-01', periodeFin: '2026-06-30' }
  const BROUILLON_EXISTANT = {
    numero: '55ème',
    periodeDebut: new Date('2026-03-01'),
    periodeFin: new Date('2026-09-30'),
  }

  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.sessionConseil.findMany.mockResolvedValue([])
    prismaFactice.sessionConseil.create.mockResolvedValue({ id: 'r-nouveau' })
    prismaFactice.enseignant.findMany.mockResolvedValue([])
    prismaFactice.echelonIndiciaire.findMany.mockResolvedValue([])
  })

  it('crée le rapport sans avertissement quand aucun brouillon ne chevauche la période', async () => {
    await expect(creerRapport({}, donnees(PERIODE))).rejects.toThrow(
      'NEXT_REDIRECT /avancements/r-nouveau?msg=rapport_cree'
    )

    expect(prismaFactice.sessionConseil.create).toHaveBeenCalledTimes(1)
  })

  it('cherche les BROUILLONS dont la période recoupe celle du nouveau rapport', async () => {
    await expect(creerRapport({}, donnees(PERIODE))).rejects.toThrow('NEXT_REDIRECT')

    expect(prismaFactice.sessionConseil.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          statut: 'BROUILLON',
          periodeDebut: { lte: new Date('2026-06-30') },
          periodeFin: { gte: new Date('2026-01-01') },
        },
      })
    )
  })

  it('avertit, en citant le brouillon et sa période, et ne crée encore rien', async () => {
    prismaFactice.sessionConseil.findMany.mockResolvedValue([BROUILLON_EXISTANT])

    const etat = await creerRapport({}, donnees(PERIODE))

    expect(etat.confirmationRequise).toBe(true)
    expect(etat.message).toContain('« 55ème » (du 01/03/2026 au 30/09/2026)')
    expect(etat.message).toMatch(/Rien n’a été créé/)
    expect(prismaFactice.sessionConseil.create).not.toHaveBeenCalled()
    expect(prismaFactice.enseignant.findMany).not.toHaveBeenCalled()
  })

  it('cite tous les brouillons concernés', async () => {
    prismaFactice.sessionConseil.findMany.mockResolvedValue([
      BROUILLON_EXISTANT,
      { ...BROUILLON_EXISTANT, numero: '54ème' },
    ])

    const etat = await creerRapport({}, donnees(PERIODE))

    expect(etat.message).toContain('« 55ème »')
    expect(etat.message).toContain('« 54ème »')
  })

  it('crée le rapport quand l’utilisateur confirme, sans même chercher les chevauchements', async () => {
    prismaFactice.sessionConseil.findMany.mockResolvedValue([BROUILLON_EXISTANT])

    await expect(
      creerRapport({}, donnees({ ...PERIODE, confirmerChevauchement: 'oui' }))
    ).rejects.toThrow('NEXT_REDIRECT /avancements/r-nouveau?msg=rapport_cree')

    expect(prismaFactice.sessionConseil.findMany).not.toHaveBeenCalled()
    expect(prismaFactice.sessionConseil.create).toHaveBeenCalledTimes(1)
  })

  it('ne confirme rien pour une autre valeur que « oui »', async () => {
    prismaFactice.sessionConseil.findMany.mockResolvedValue([BROUILLON_EXISTANT])

    const etat = await creerRapport({}, donnees({ ...PERIODE, confirmerChevauchement: 'non' }))

    expect(etat.confirmationRequise).toBe(true)
    expect(prismaFactice.sessionConseil.create).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------------------
// A3 : la période d'un rapport se modifie en brouillon ; en rapport validé, la nouvelle date de
// fin est reportée partout où la validation l'a recopiée, ou refusée.

describe('mettreAJourRapport : brouillon', () => {
  const DEBUT = new Date('2025-07-01')
  const FIN = new Date('2025-12-31')
  const BROUILLON = { statut: 'BROUILLON', periodeDebut: DEBUT, periodeFin: FIN }
  const SAISIE = { numero: '55ème', periodeDebut: '2025-07-01', periodeFin: '2025-12-31' }
  const AUTRE_BROUILLON = {
    numero: '54ème',
    periodeDebut: new Date('2025-10-01'),
    periodeFin: new Date('2026-03-31'),
  }

  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(BROUILLON)
    prismaFactice.sessionConseil.findMany.mockResolvedValue([])
    prismaFactice.sessionConseil.updateMany.mockResolvedValue({ count: 1 })
  })

  it('modifie le numéro et la période d’un brouillon', async () => {
    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ numero: '56ème', periodeDebut: '2025-08-01', periodeFin: '2026-01-31' })
    )

    expect(etat.succes).toBe(true)
    expect(prismaFactice.sessionConseil.updateMany).toHaveBeenCalledWith({
      where: { id: RAPPORT, statut: { not: 'VALIDE' } },
      data: {
        numero: '56ème',
        periodeDebut: new Date('2025-08-01'),
        periodeFin: new Date('2026-01-31'),
      },
    })
    expect(prismaFactice.$transaction).not.toHaveBeenCalled()
  })

  it('répond « introuvable » pour un rapport qui n’existe pas, sans rien écrire', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(null)

    const etat = await mettreAJourRapport(RAPPORT, {}, donnees(SAISIE))

    expect(etat.message).toBe('Rapport introuvable.')
    expect(prismaFactice.sessionConseil.updateMany).not.toHaveBeenCalled()
  })

  it('avertit quand la nouvelle période chevauche un autre brouillon, sans rien enregistrer', async () => {
    prismaFactice.sessionConseil.findMany.mockResolvedValue([AUTRE_BROUILLON])

    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ ...SAISIE, periodeFin: '2026-02-28' })
    )

    expect(etat.confirmationRequise).toBe(true)
    expect(etat.message).toContain('« 54ème » (du 01/10/2025 au 31/03/2026)')
    expect(etat.message).toMatch(/Rien n’a été enregistré/)
    expect(prismaFactice.sessionConseil.updateMany).not.toHaveBeenCalled()
  })

  it('ne compte pas le rapport modifié lui-même parmi les chevauchements', async () => {
    await mettreAJourRapport(RAPPORT, {}, donnees({ ...SAISIE, periodeFin: '2026-02-28' }))

    expect(prismaFactice.sessionConseil.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          statut: 'BROUILLON',
          periodeDebut: { lte: new Date('2026-02-28') },
          periodeFin: { gte: DEBUT },
          id: { not: RAPPORT },
        },
      })
    )
  })

  it('enregistre quand l’utilisateur confirme, sans refaire la recherche', async () => {
    prismaFactice.sessionConseil.findMany.mockResolvedValue([AUTRE_BROUILLON])

    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ ...SAISIE, periodeFin: '2026-02-28', confirmerChevauchement: 'oui' })
    )

    expect(etat.succes).toBe(true)
    expect(prismaFactice.sessionConseil.findMany).not.toHaveBeenCalled()
    expect(prismaFactice.sessionConseil.updateMany).toHaveBeenCalledTimes(1)
  })

  it('ne cherche aucun chevauchement quand seul le numéro change', async () => {
    prismaFactice.sessionConseil.findMany.mockResolvedValue([AUTRE_BROUILLON])

    const etat = await mettreAJourRapport(RAPPORT, {}, donnees({ ...SAISIE, numero: '55ème bis' }))

    expect(etat.succes).toBe(true)
    expect(prismaFactice.sessionConseil.findMany).not.toHaveBeenCalled()
  })

  it('refuse sans rien changer si le rapport a été validé entre-temps', async () => {
    prismaFactice.sessionConseil.updateMany.mockResolvedValue({ count: 0 })

    const etat = await mettreAJourRapport(RAPPORT, {}, donnees(SAISIE))

    expect(etat.succes).toBeUndefined()
    expect(etat.message).toMatch(/vient d’être validé/)
  })

  it('traduit une erreur de la base en message lisible', async () => {
    prismaFactice.sessionConseil.updateMany.mockRejectedValue(new Error('connexion perdue'))
    const erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})

    const etat = await mettreAJourRapport(RAPPORT, {}, donnees(SAISIE))

    expect(etat.succes).toBeUndefined()
    expect(etat.message).not.toMatch(/connexion perdue/)
    expect(etat.message).toBeTruthy()
    expect(erreurConsole).toHaveBeenCalled()
    erreurConsole.mockRestore()
  })
})

describe('mettreAJourRapport : rapport validé', () => {
  const DEBUT = new Date('2025-07-01')
  const FIN = new Date('2025-12-31')
  const VALIDE = { statut: 'VALIDE', periodeDebut: DEBUT, periodeFin: FIN }
  const SAISIE = { numero: '55ème', periodeDebut: '2025-07-01', periodeFin: '2025-12-31' }

  /** Un avancement du rapport, tel que la transaction le relit : l'enseignant est resté dessus. */
  function avancement(
    n: number,
    surcharge: Record<string, unknown> = {},
    positionActuelleId = 'pos-3'
  ) {
    return {
      enseignantId: `ens-${n}`,
      nouvellePositionId: 'pos-3',
      statutDecision: null,
      enseignant: { nom: `NOM${n}`, prenom: 'Jean', positionActuelleId },
      ...surcharge,
    }
  }

  function rapportRelu(avancements: ReturnType<typeof avancement>[]) {
    tx.sessionConseil.findUnique.mockResolvedValue({ periodeFin: FIN, avancements })
  }

  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(VALIDE)
    prismaFactice.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
    rapportRelu([avancement(1), avancement(2)])
  })

  it('reporte la nouvelle date de fin sur l’historique et sur les fiches, dans une seule transaction', async () => {
    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ ...SAISIE, periodeFin: '2026-01-15' })
    )

    expect(etat.succes).toBe(true)
    expect(etat.message).toMatch(/reportée sur 2 avancements/)
    expect(etat.message).toContain('15/01/2026')
    expect(prismaFactice.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.sessionConseil.update).toHaveBeenCalledWith({
      where: { id: RAPPORT },
      data: {
        numero: '55ème',
        periodeDebut: DEBUT,
        periodeFin: new Date('2026-01-15'),
      },
    })
    expect(tx.historiqueAvancement.updateMany).toHaveBeenCalledWith({
      where: { sessionId: RAPPORT },
      data: { dateNouvelEffet: new Date('2026-01-15') },
    })
    expect(tx.enseignant.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['ens-1', 'ens-2'] } },
      data: { dateEffetEchelon: new Date('2026-01-15') },
    })
    expect(journal).toEqual(['rapport.update', 'historique.updateMany', 'enseignant.updateMany'])
  })

  it('n’utilise pas la base hors transaction pour écrire', async () => {
    await mettreAJourRapport(RAPPORT, {}, donnees({ ...SAISIE, periodeFin: '2026-01-15' }))

    expect(prismaFactice.sessionConseil.updateMany).not.toHaveBeenCalled()
    expect(prismaFactice.sessionConseil.update).not.toHaveBeenCalled()
  })

  it('refuse le changement de fin quand une décision a été générée, sans rien écrire', async () => {
    rapportRelu([avancement(1), avancement(2, { statutDecision: 'GENEREE' })])

    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ ...SAISIE, periodeFin: '2026-01-15' })
    )

    expect(etat.succes).toBeUndefined()
    expect(etat.message).toContain('NOM2 Jean (une décision a déjà été générée)')
    expect(etat.message).not.toContain('NOM1')
    expect(journal).toEqual([])
  })

  it('refuse le changement de fin quand un enseignant a changé de position depuis', async () => {
    rapportRelu([avancement(1), avancement(2, {}, 'pos-4')])

    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ ...SAISIE, periodeFin: '2026-01-15' })
    )

    expect(etat.message).toContain('NOM2 Jean (a changé de position depuis la validation)')
    expect(journal).toEqual([])
  })

  it('modifie le numéro d’un rapport validé même si des décisions ont été générées', async () => {
    rapportRelu([avancement(1, { statutDecision: 'GENEREE' }), avancement(2, {}, 'pos-4')])

    const etat = await mettreAJourRapport(RAPPORT, {}, donnees({ ...SAISIE, numero: '55ème bis' }))

    expect(etat.succes).toBe(true)
    expect(etat.message).toBe('Informations du rapport mises à jour.')
    expect(tx.sessionConseil.update).toHaveBeenCalledWith({
      where: { id: RAPPORT },
      data: { numero: '55ème bis', periodeDebut: DEBUT, periodeFin: FIN },
    })
    // Aucune date d'effet ne bouge : ni l'historique ni les fiches.
    expect(journal).toEqual(['rapport.update'])
  })

  it('modifie le début de période sans toucher aux dates d’effet', async () => {
    rapportRelu([avancement(1, { statutDecision: 'GENEREE' })])

    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ ...SAISIE, periodeDebut: '2025-06-01' })
    )

    expect(etat.succes).toBe(true)
    expect(journal).toEqual(['rapport.update'])
  })

  it('met à jour un rapport validé sans avancement sans rien propager', async () => {
    rapportRelu([])

    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ ...SAISIE, periodeFin: '2026-01-15' })
    )

    expect(etat.succes).toBe(true)
    expect(journal).toEqual(['rapport.update'])
  })

  it('ne recopie pas les dates quand la transaction relit un rapport disparu', async () => {
    tx.sessionConseil.findUnique.mockResolvedValue(null)

    const etat = await mettreAJourRapport(RAPPORT, {}, donnees(SAISIE))

    expect(etat.message).toBe('Rapport introuvable.')
    expect(journal).toEqual([])
  })

  it('traduit un échec de la transaction en message lisible : rien n’a été modifié', async () => {
    prismaFactice.$transaction.mockRejectedValue(new Error('transaction annulée'))
    const erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})

    const etat = await mettreAJourRapport(
      RAPPORT,
      {},
      donnees({ ...SAISIE, periodeFin: '2026-01-15' })
    )

    expect(etat.succes).toBeUndefined()
    expect(etat.message).not.toMatch(/transaction annulée/)
    expect(erreurConsole).toHaveBeenCalled()
    erreurConsole.mockRestore()
  })
})

// ---------------------------------------------------------------------------------------
// Métadonnées du conseil : modifiables à tout moment, en plusieurs fois, y compris après la
// validation ; un brouillon de décision se régénère, une décision signée jamais.

describe('mettreAJourMetadonneesSession', () => {
  const COMPLETES = {
    referenceLoiFinances: 'Loi n° 2025/012 du 17 décembre 2025',
    referenceCirculaire: 'Circulaire n° 00001877/C/MINFI',
    dateSessionCU: '2025-12-22',
    dateSessionCA: '2026-01-07',
    dateSignatureDecisions: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.sessionConseil.update.mockResolvedValue({})
  })

  it('enregistre des métadonnées complètes et annonce la réussite', async () => {
    const etat = await mettreAJourMetadonneesSession(RAPPORT, {}, donnees(COMPLETES))

    expect(etat).toEqual({ message: 'Métadonnées enregistrées.', succes: true })
    expect(prismaFactice.sessionConseil.update).toHaveBeenCalledWith({
      where: { id: RAPPORT },
      data: {
        referenceLoiFinances: 'Loi n° 2025/012 du 17 décembre 2025',
        referenceCirculaire: 'Circulaire n° 00001877/C/MINFI',
        dateSessionCU: new Date('2025-12-22'),
        dateSessionCA: new Date('2026-01-07'),
        dateSignatureDecisions: null,
      },
    })
  })

  it('enregistre des métadonnées incomplètes : ce qui n’est pas encore connu reste vide', async () => {
    const etat = await mettreAJourMetadonneesSession(
      RAPPORT,
      {},
      donnees({ ...COMPLETES, referenceCirculaire: '', dateSessionCA: '' })
    )

    expect(etat.succes).toBe(true)
    expect(prismaFactice.sessionConseil.update).toHaveBeenCalledWith({
      where: { id: RAPPORT },
      data: expect.objectContaining({
        referenceLoiFinances: 'Loi n° 2025/012 du 17 décembre 2025',
        referenceCirculaire: null,
        dateSessionCU: new Date('2025-12-22'),
        dateSessionCA: null,
      }),
    })
  })

  it('permet de retirer une valeur : la base reçoit null, jamais undefined (ignoré par Prisma)', async () => {
    await mettreAJourMetadonneesSession(
      RAPPORT,
      {},
      donnees({
        referenceLoiFinances: '',
        referenceCirculaire: '',
        dateSessionCU: '',
        dateSessionCA: '',
        dateSignatureDecisions: '',
      })
    )

    const { data } = prismaFactice.sessionConseil.update.mock.calls[0]![0] as {
      data: Record<string, unknown>
    }
    expect(data).toEqual({
      referenceLoiFinances: null,
      referenceCirculaire: null,
      dateSessionCU: null,
      dateSessionCA: null,
      dateSignatureDecisions: null,
    })
  })

  it('ne regarde pas le statut du rapport : un rapport validé se complète comme un brouillon', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue({ id: RAPPORT, statut: 'VALIDE' })

    const etat = await mettreAJourMetadonneesSession(RAPPORT, {}, donnees(COMPLETES))

    expect(etat.succes).toBe(true)
    expect(prismaFactice.sessionConseil.update).toHaveBeenCalledTimes(1)
  })

  it('refuse une date illisible, avec une erreur par champ et un message, sans rien écrire', async () => {
    const etat = await mettreAJourMetadonneesSession(
      RAPPORT,
      {},
      donnees({ ...COMPLETES, dateSessionCU: '22/12/2025' })
    )

    expect(etat.succes).toBeUndefined()
    expect(etat.errors?.dateSessionCU).toBeDefined()
    expect(etat.message).toMatch(/session du Conseil universitaire/)
    expect(prismaFactice.sessionConseil.update).not.toHaveBeenCalled()
  })

  it('répond « introuvable » quand le rapport a disparu entre-temps', async () => {
    prismaFactice.sessionConseil.update.mockRejectedValue(
      Object.assign(new Error('introuvable'), { code: 'P2025' })
    )

    const etat = await mettreAJourMetadonneesSession(RAPPORT, {}, donnees(COMPLETES))

    expect(etat.succes).toBeUndefined()
    expect(etat.message).toBe('Rapport introuvable.')
  })

  it('traduit une autre erreur de la base en message lisible', async () => {
    prismaFactice.sessionConseil.update.mockRejectedValue(new Error('connexion perdue'))
    const erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})

    const etat = await mettreAJourMetadonneesSession(RAPPORT, {}, donnees(COMPLETES))

    expect(etat.succes).toBeUndefined()
    expect(etat.message).not.toMatch(/connexion perdue/)
    expect(erreurConsole).toHaveBeenCalled()
    erreurConsole.mockRestore()
  })
})

describe('genererDecision : brouillon et décision signée', () => {
  const AVANCEMENT = 'av-1'

  function avancement(statutDecision: string | null) {
    return {
      id: AVANCEMENT,
      sessionId: RAPPORT,
      statutDecision,
      enseignant: {},
      anciennePosition: {},
      nouvellePosition: {},
      dateAncienEffet: new Date('2023-11-26'),
      dateNouvelEffet: new Date('2025-11-26'),
      session: { referenceLoiFinances: 'Loi' },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    genererDecisionFactice.mockReturnValue(Buffer.from('docx'))
    prismaFactice.historiqueAvancement.update.mockResolvedValue({})
  })

  it('génère le brouillon d’une décision qui n’existe pas encore', async () => {
    prismaFactice.historiqueAvancement.findUnique.mockResolvedValue(avancement(null))

    const etat = await genererDecision(AVANCEMENT, {})

    expect(etat.succes).toBe(true)
    expect(prismaFactice.historiqueAvancement.update).toHaveBeenCalledWith({
      where: { id: AVANCEMENT },
      data: expect.objectContaining({ statutDecision: 'EN_ATTENTE' }),
    })
  })

  it('régénère un brouillon en attente, avec les métadonnées d’aujourd’hui', async () => {
    prismaFactice.historiqueAvancement.findUnique.mockResolvedValue(avancement('EN_ATTENTE'))

    const etat = await genererDecision(AVANCEMENT, {})

    expect(etat.succes).toBe(true)
    expect(genererDecisionFactice).toHaveBeenCalledWith(
      expect.objectContaining({ numeroDecision: '', rapport: { referenceLoiFinances: 'Loi' } })
    )
    expect(prismaFactice.historiqueAvancement.update).toHaveBeenCalledTimes(1)
  })

  it('refuse de régénérer une décision signée, qui ne revient pas « en attente »', async () => {
    prismaFactice.historiqueAvancement.findUnique.mockResolvedValue(avancement('VALIDEE'))

    const etat = await genererDecision(AVANCEMENT, {})

    expect(etat.succes).toBeUndefined()
    expect(etat.message).toMatch(/déjà signée/)
    expect(genererDecisionFactice).not.toHaveBeenCalled()
    expect(prismaFactice.historiqueAvancement.update).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------------------
// D7 : délais des transactions, une seule écriture pour l'historique, expiration signalée.

describe('transactions des avancements : délais et expiration (D7)', () => {
  const OPTIONS = { maxWait: 5000, timeout: 30000 }
  /** L'erreur que Prisma lève quand une transaction interactive dépasse son délai. */
  const expiration = () =>
    Object.assign(new Error('Transaction already closed: timeout exceeded'), { code: 'P2028' })

  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
  })

  /** Chacune des actions qui ouvrent une transaction, prête à être appelée. */
  const ACTIONS: [string, () => Promise<unknown>][] = [
    [
      'validerRapport',
      async () => {
        tx.sessionConseil.findUnique.mockResolvedValue({
          id: RAPPORT,
          statut: 'BROUILLON',
          periodeFin: PERIODE_FIN,
          selections: [selectionAValider(1)],
        })
        await validerRapport(
          RAPPORT,
          {},
          donnees({ dateValidation: '2026-01-10', auteurValidation: 'Le Recteur' })
        ).catch(() => undefined) // la réussite redirige
      },
    ],
    [
      'supprimerRapport',
      async () => {
        prismaFactice.sessionConseil.findUnique.mockResolvedValue(rapportBrouillon())
        await supprimerRapport(RAPPORT, {}, new FormData()).catch(() => undefined)
      },
    ],
    [
      'retirerSelection',
      async () => {
        prismaFactice.sessionConseil.findUnique.mockResolvedValue({
          id: RAPPORT,
          statut: 'BROUILLON',
        })
        prismaFactice.selectionAvancement.findUnique.mockResolvedValue({ id: 'sel-1' })
        await retirerSelection(RAPPORT, 'ens-1')
      },
    ],
    [
      'modifierSelection',
      async () => {
        prismaFactice.sessionConseil.findUnique.mockResolvedValue({
          id: RAPPORT,
          statut: 'BROUILLON',
          periodeFin: PERIODE_FIN,
        })
        prismaFactice.selectionAvancement.findUnique.mockResolvedValue({
          id: 'sel-1',
          rapportId: RAPPORT,
          enseignantId: 'ens-1',
        })
        prismaFactice.enseignant.findUnique.mockResolvedValue({
          id: 'ens-1',
          positionActuelleId: A2.id,
          positionActuelle: A2,
        })
        prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A5)
        await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(A5.id))
      },
    ],
    [
      'mettreAJourRapport (rapport validé)',
      async () => {
        prismaFactice.sessionConseil.findUnique.mockResolvedValue({
          statut: 'VALIDE',
          periodeDebut: new Date('2025-07-01'),
          periodeFin: PERIODE_FIN,
        })
        tx.sessionConseil.findUnique.mockResolvedValue({ periodeFin: PERIODE_FIN, avancements: [] })
        await mettreAJourRapport(
          RAPPORT,
          {},
          donnees({ numero: '55ème', periodeDebut: '2025-07-01', periodeFin: '2025-12-31' })
        )
      },
    ],
  ]

  it.each(ACTIONS)(
    '%s ouvre sa transaction avec des délais plus larges que ceux de Prisma',
    async (_nom, lancer) => {
      await lancer()

      expect(prismaFactice.$transaction).toHaveBeenCalledTimes(1)
      expect(prismaFactice.$transaction).toHaveBeenCalledWith(expect.any(Function), OPTIONS)
    }
  )

  describe('transaction expirée', () => {
    beforeEach(() => {
      prismaFactice.$transaction.mockRejectedValue(expiration())
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('validerRapport répond que la validation a pris trop de temps et que rien n’a été modifié', async () => {
      const etat = await validerRapport(
        RAPPORT,
        {},
        donnees({ dateValidation: '2026-01-10', auteurValidation: 'Le Recteur' })
      )

      expect(etat.message).toMatch(/La validation a pris trop de temps/)
      expect(etat.message).toMatch(/rien n’a été modifié/)
      expect(etat.succes).toBeUndefined()
    })

    it('validerRapport ne redirige pas et ne rafraîchit rien', async () => {
      const { revalidatePath } = await import('next/cache')
      const { redirect } = await import('next/navigation')

      await validerRapport(
        RAPPORT,
        {},
        donnees({ dateValidation: '2026-01-10', auteurValidation: 'Le Recteur' })
      )

      expect(redirect).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('modifierSelection répond que la modification a pris trop de temps', async () => {
      prismaFactice.sessionConseil.findUnique.mockResolvedValue({
        id: RAPPORT,
        statut: 'BROUILLON',
        periodeFin: PERIODE_FIN,
      })
      prismaFactice.selectionAvancement.findUnique.mockResolvedValue({
        id: 'sel-1',
        rapportId: RAPPORT,
        enseignantId: 'ens-1',
      })
      prismaFactice.enseignant.findUnique.mockResolvedValue({
        id: 'ens-1',
        positionActuelleId: A2.id,
        positionActuelle: A2,
      })
      prismaFactice.echelonIndiciaire.findUnique.mockResolvedValue(A5)

      const etat = await modifierSelection(RAPPORT, 'sel-1', {}, formulairePosition(A5.id))

      expect(etat.message).toMatch(/La modification a pris trop de temps/)
      expect(etat.succes).toBeUndefined()
    })

    it('mettreAJourRapport (rapport validé) répond que la modification a pris trop de temps', async () => {
      prismaFactice.sessionConseil.findUnique.mockResolvedValue({
        statut: 'VALIDE',
        periodeDebut: new Date('2025-07-01'),
        periodeFin: PERIODE_FIN,
      })

      const etat = await mettreAJourRapport(
        RAPPORT,
        {},
        donnees({ numero: '55ème', periodeDebut: '2025-07-01', periodeFin: '2026-01-15' })
      )

      expect(etat.message).toMatch(/La modification a pris trop de temps/)
      expect(etat.succes).toBeUndefined()
    })
  })

  it('validerRapport traduit toute autre erreur de la base au lieu de planter la page', async () => {
    prismaFactice.$transaction.mockRejectedValue(new Error('connexion perdue'))
    const erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})

    const etat = await validerRapport(
      RAPPORT,
      {},
      donnees({ dateValidation: '2026-01-10', auteurValidation: 'Le Recteur' })
    )

    expect(etat.message).toMatch(/erreur technique/i)
    expect(etat.message).not.toMatch(/connexion perdue/)
    expect(erreurConsole).toHaveBeenCalled()
  })

  describe('validerRapport sur un grand rapport', () => {
    const N = 300

    it('écrit tout l’historique en UNE seule requête, et une fiche par enseignant', async () => {
      tx.sessionConseil.findUnique.mockResolvedValue({
        id: RAPPORT,
        statut: 'BROUILLON',
        periodeFin: PERIODE_FIN,
        selections: Array.from({ length: N }, (_, i) => selectionAValider(i + 1)),
      })

      await expect(
        validerRapport(
          RAPPORT,
          {},
          donnees({ dateValidation: '2026-01-10', auteurValidation: 'Le Recteur' })
        )
      ).rejects.toThrow('NEXT_REDIRECT')

      expect(tx.historiqueAvancement.create).not.toHaveBeenCalled()
      expect(tx.historiqueAvancement.createMany).toHaveBeenCalledTimes(1)
      expect(tx.historiqueAvancement.createMany.mock.calls[0]![0].data).toHaveLength(N)
      expect(tx.enseignant.update).toHaveBeenCalledTimes(N)
    })

    it('retire tous les exclus en une seule requête', async () => {
      const exclus = Array.from({ length: 40 }, (_, i) =>
        selectionAValider(i + 100, { statut: 'RETRAITE' })
      )
      tx.sessionConseil.findUnique.mockResolvedValue({
        id: RAPPORT,
        statut: 'BROUILLON',
        periodeFin: PERIODE_FIN,
        selections: [selectionAValider(1), ...exclus],
      })

      await expect(
        validerRapport(
          RAPPORT,
          {},
          donnees({
            dateValidation: '2026-01-10',
            auteurValidation: 'Le Recteur',
            exclusionsConfirmees: exclus.map((e) => e.enseignantId).join(','),
          })
        )
      ).rejects.toThrow('NEXT_REDIRECT')

      expect(tx.selectionAvancement.delete).not.toHaveBeenCalled()
      expect(tx.selectionAvancement.deleteMany).toHaveBeenCalledTimes(1)
      // `tracer` fabrique un mock sans paramètre : on type l'appel lu, comme pour `update` plus haut.
      const [appel] = tx.selectionAvancement.deleteMany.mock.calls as unknown as [
        [{ where: { id: { in: string[] } } }],
      ]
      expect(appel[0].where.id.in).toHaveLength(40)
    })
  })
})
