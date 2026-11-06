import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaFactice } = vi.hoisted(() => ({
  prismaFactice: { sessionConseil: { count: vi.fn(), findMany: vi.fn() } },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))

const { recupererRapports } = await import('./donnees')

const lecture = () => prismaFactice.sessionConseil.findMany.mock.calls[0]![0]

describe('recupererRapports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaFactice.sessionConseil.findMany.mockResolvedValue([])
  })

  it('lit une page, du plus récent au plus ancien, avec l’identifiant pour départager', async () => {
    prismaFactice.sessionConseil.count.mockResolvedValue(45)

    const { page, totalPages } = await recupererRapports({ page: 2 })

    expect(lecture()).toEqual(
      expect.objectContaining({
        orderBy: [{ periodeDebut: 'desc' }, { id: 'asc' }],
        skip: 20,
        take: 20,
      })
    )
    expect([page, totalPages]).toEqual([2, 3])
  })

  it('ramène une page trop grande à la dernière', async () => {
    prismaFactice.sessionConseil.count.mockResolvedValue(45)

    const { page, totalPages } = await recupererRapports({ page: 999 })

    expect(lecture()).toEqual(expect.objectContaining({ skip: 40, take: 20 }))
    expect([page, totalPages]).toEqual([3, 3])
  })

  it.each([0, -3, 0.4, Number.NaN])('ne passe jamais %s à skip', async (demandee) => {
    prismaFactice.sessionConseil.count.mockResolvedValue(45)

    const { page } = await recupererRapports({ page: demandee })

    expect(lecture()).toEqual(expect.objectContaining({ skip: 0 }))
    expect(page).toBe(1)
  })
})

describe('recupererRapports — recherche libre (D6)', () => {
  // Les éditions que la recherche lit (id et numéro), puis la page, d'où deux sortes de findMany.
  const EDITIONS = [
    { id: 'r54', numero: '54ème' },
    { id: 'r55', numero: '55ème' },
    { id: 'rspec', numero: 'Session spéciale 2026-003' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    prismaFactice.sessionConseil.count.mockResolvedValue(0)
    prismaFactice.sessionConseil.findMany.mockImplementation(
      async (demande: { select?: unknown }) => (demande.select ? EDITIONS : [])
    )
  })

  /** Le filtre posé sur les rapports : le même pour le total et pour la page. */
  async function filtreDe(recherche: string | undefined) {
    await recupererRapports({ recherche })
    const duTotal = prismaFactice.sessionConseil.count.mock.calls[0]![0]!.where
    const lectures = prismaFactice.sessionConseil.findMany.mock.calls
    const delaPage = lectures[lectures.length - 1]![0]!.where
    expect(delaPage).toEqual(duTotal)
    return delaPage
  }

  describe('une date AAAA-MM-JJ', () => {
    it.each(['2026-03-15', ' 2026-03-15 '])(
      'cherche les rapports dont la période contient le jour (%j)',
      async (recherche) => {
        const jour = new Date('2026-03-15T00:00:00.000Z')

        expect(await filtreDe(recherche)).toEqual({
          periodeDebut: { lte: jour },
          periodeFin: { gte: jour },
        })
        // Pas besoin de lire les éditions : une seule lecture, celle de la page.
        expect(prismaFactice.sessionConseil.findMany).toHaveBeenCalledTimes(1)
      }
    )
  })

  describe('tout le reste est cherché dans le numéro d’édition', () => {
    // Avant, `new Date(saisie)` lisait comme des dates « 54 », « 2026 », « 2026-003 » ou
    // « Mars 2026 », et la recherche d'une édition renvoyait les rapports d'une période.
    it.each([
      ['un numéro seul', '54', ['r54']],
      ['une année', '2026', ['rspec']],
      ['un numéro à tiret', '2026-003', ['rspec']],
      ['un mois et une année', 'Mars 2026', []],
      ['une date qui n’existe pas', '2026-02-30', []],
      ['une date jour/mois/année', '15/03/2026', []],
    ] as [string, string, string[]][])(
      'ne lit pas %s comme une date : %j',
      async (_cas, recherche, attendus) => {
        expect(await filtreDe(recherche)).toEqual({ id: { in: attendus } })
      }
    )

    it.each([
      ['sans accent', '54eme', ['r54']],
      ['avec accent', '54ème', ['r54']],
      ['en majuscules', '55 ÈME', ['r55']],
      ['une partie du mot', 'ème', ['r54', 'r55']],
      ['des mots dans le désordre', '2026 speciale', ['rspec']],
      ['un mot qui manque', '54ème spéciale', []],
    ] as [string, string, string[]][])('trouve l’édition %s : %j', async (_cas, recherche, ids) => {
      expect(await filtreDe(recherche)).toEqual({ id: { in: ids } })
    })

    it('ne lit que le numéro et l’identifiant des éditions', async () => {
      await filtreDe('54')

      expect(prismaFactice.sessionConseil.findMany).toHaveBeenCalledWith({
        select: { id: true, numero: true },
      })
    })
  })

  it.each([
    ['absente', undefined],
    ['vide', ''],
    ['faite d’espaces', '   '],
    ['faite de ponctuation', ' - . '],
  ])('une recherche %s ne filtre rien et ne lit pas les éditions', async (_cas, recherche) => {
    expect(await filtreDe(recherche)).toEqual({})
    expect(prismaFactice.sessionConseil.findMany).toHaveBeenCalledTimes(1)
  })
})
