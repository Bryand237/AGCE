import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base est simulée : on vérifie ici ce que l'action demande à Prisma (quelles
// suppressions, dans quel ordre, dans une transaction) et ce qu'elle répond à
// l'écran. Le comportement réel des clés étrangères se contrôle sur la base.
const { journal, prismaFactice, tx } = vi.hoisted(() => {
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
    sessionConseil: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  }
  return { journal, prismaFactice, tx }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
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

const { supprimerRapport } = await import('./actions')

const RAPPORT = 'r-1'

function rapportBrouillon(surcharge: Record<string, unknown> = {}) {
  return { id: RAPPORT, statut: 'BROUILLON', avancements: [], ...surcharge }
}

describe('supprimerRapport', () => {
  beforeEach(() => {
    journal.length = 0
    vi.clearAllMocks()
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

  it('revient simplement à la liste si le rapport n’existe plus', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(null)

    await expect(supprimerRapport(RAPPORT, {}, new FormData())).rejects.toThrow(
      'NEXT_REDIRECT /avancements'
    )
    expect(prismaFactice.$transaction).not.toHaveBeenCalled()
  })
})
