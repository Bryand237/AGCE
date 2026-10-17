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
    enseignant: { update: tracer('enseignant.update') },
    selectionAvancement: { deleteMany: tracer('selection.deleteMany') },
    historiqueAvancement: { deleteMany: tracer('historique.deleteMany') },
    sessionConseil: { delete: tracer('rapport.delete') },
  }
  const prismaFactice = {
    sessionConseil: { findUnique: vi.fn(), update: vi.fn() },
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

const { creerRapport, mettreAJourRapport, supprimerRapport, validerDecision } =
  await import('./actions')

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
