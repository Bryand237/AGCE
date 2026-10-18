import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base est simulée : on vérifie ici ce que l'action demande à Prisma (quelles
// suppressions, dans quel ordre, dans une transaction) et ce qu'elle répond à
// l'écran. Le comportement réel des clés étrangères se contrôle sur la base.
const { exigerUtilisateur, journal, prismaFactice, tx } = vi.hoisted(() => {
  const journal: string[] = []
  const tracer = (nom: string) =>
    vi.fn(async () => {
      journal.push(nom)
    })

  const tx = {
    enseignant: { update: tracer('enseignant.update'), findUnique: vi.fn() },
    selectionAvancement: {
      deleteMany: tracer('selection.deleteMany'),
      delete: vi.fn(),
      update: vi.fn(),
    },
    historiqueAvancement: {
      deleteMany: tracer('historique.deleteMany'),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    sessionConseil: { delete: tracer('rapport.delete'), update: vi.fn(), findUnique: vi.fn() },
  }
  const prismaFactice = {
    sessionConseil: { findUnique: vi.fn(), update: vi.fn() },
    selectionAvancement: { findUnique: vi.fn() },
    echelonIndiciaire: { findUnique: vi.fn() },
    enseignant: { findUnique: vi.fn() },
    historiqueAvancement: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  }
  return { exigerUtilisateur: vi.fn(), journal, prismaFactice, tx }
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
  genererDecisionAvancement: vi.fn(),
}))

const {
  creerRapport,
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
      'NEXT_REDIRECT /avancements'
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
  const INVERSEE = { ...PERIODE, periodeDebut: '2025-12-31', periodeFin: '2025-07-01' }

  beforeEach(() => {
    vi.clearAllMocks()
    exigerUtilisateur.mockResolvedValue({ id: 'u-1' })
    prismaFactice.sessionConseil.update.mockResolvedValue({})
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
    expect(prismaFactice.sessionConseil.update).not.toHaveBeenCalled()
  })

  it('mettreAJourRapport enregistre une période cohérente et annonce la réussite', async () => {
    const etat = await mettreAJourRapport(RAPPORT, {}, donnees({ ...PERIODE, numero: ' 55ème ' }))

    expect(etat.succes).toBe(true)
    expect(prismaFactice.sessionConseil.update).toHaveBeenCalledWith({
      where: { id: RAPPORT },
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
      'NEXT_REDIRECT /avancements'
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
    expect(tx.historiqueAvancement.create).not.toHaveBeenCalled()
    expect(tx.enseignant.update).not.toHaveBeenCalled()
    expect(tx.selectionAvancement.delete).not.toHaveBeenCalled()
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

    await expect(valider()).rejects.toThrow(`NEXT_REDIRECT /avancements/${RAPPORT}`)

    expect(tx.historiqueAvancement.create).toHaveBeenCalledTimes(2)
    expect(tx.enseignant.update).toHaveBeenCalledWith({
      where: { id: 'ens-1' },
      data: { positionActuelleId: A3.id, grade: 'ASSISTANT', dateEffetEchelon: PERIODE_FIN },
    })
    expect(tx.selectionAvancement.delete).not.toHaveBeenCalled()
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
      `NEXT_REDIRECT /avancements/${RAPPORT}`
    )

    expect(tx.historiqueAvancement.create).toHaveBeenCalledTimes(1)
    expect(tx.historiqueAvancement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ enseignantId: 'ens-1', nouvellePositionId: A3.id }),
    })
    expect(tx.enseignant.update).toHaveBeenCalledTimes(1)
    expect(tx.selectionAvancement.delete).toHaveBeenCalledWith({ where: { id: 'sel-2' } })
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
