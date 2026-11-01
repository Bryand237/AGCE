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

  it('compte et lit avec la même recherche', async () => {
    prismaFactice.sessionConseil.count.mockResolvedValue(1)

    await recupererRapports({ recherche: 'ème session' })

    const filtre = { numero: { contains: 'ème session', mode: 'insensitive' } }
    expect(prismaFactice.sessionConseil.count).toHaveBeenCalledWith({ where: filtre })
    expect(lecture().where).toEqual(filtre)
  })
})
