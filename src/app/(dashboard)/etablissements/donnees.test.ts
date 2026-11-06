import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaFactice } = vi.hoisted(() => ({
  prismaFactice: {
    etablissement: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    departement: { count: vi.fn(), findMany: vi.fn() },
    enseignant: { count: vi.fn() },
  },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))

const { recupererEtablissements, recupererEtablissementParIdPaged } = await import('./donnees')

describe('recupererEtablissements', () => {
  const lecture = () => prismaFactice.etablissement.findMany.mock.calls[0]![0]

  beforeEach(() => {
    vi.clearAllMocks()
    prismaFactice.etablissement.findMany.mockResolvedValue([])
  })

  it('départage les établissements de même type par leur nom puis leur identifiant', async () => {
    prismaFactice.etablissement.count.mockResolvedValue(45)

    await recupererEtablissements({ page: 2, tri: 'desc' })

    // Il n'y a que deux types : sans les deux derniers critères, presque toutes les lignes sont
    // « égales » et leur ordre peut changer d'une page à l'autre.
    expect(lecture()).toEqual(
      expect.objectContaining({
        orderBy: [{ type: 'desc' }, { nom: 'asc' }, { id: 'asc' }],
        skip: 20,
        take: 20,
      })
    )
  })

  it('ramène une page trop grande à la dernière et renvoie la page réellement lue', async () => {
    prismaFactice.etablissement.count.mockResolvedValue(45)

    const { page, totalPages, total } = await recupererEtablissements({ page: 999 })

    expect(lecture()).toEqual(expect.objectContaining({ skip: 40 }))
    expect([page, totalPages, total]).toEqual([3, 3, 45])
  })

  it.each([0, -3, 0.4, Number.NaN])('ne passe jamais %s à skip', async (demandee) => {
    prismaFactice.etablissement.count.mockResolvedValue(45)

    const { page } = await recupererEtablissements({ page: demandee })

    expect(lecture()).toEqual(expect.objectContaining({ skip: 0 }))
    expect(page).toBe(1)
  })
})

describe('recupererEtablissementParIdPaged', () => {
  const lecture = () => prismaFactice.departement.findMany.mock.calls[0]![0]

  beforeEach(() => {
    vi.clearAllMocks()
    prismaFactice.etablissement.findUnique.mockResolvedValue({ id: 'e1', nom: 'Faculté' })
    prismaFactice.departement.findMany.mockResolvedValue([])
    prismaFactice.enseignant.count.mockResolvedValue(80)
  })

  it('lit les départements par nom, puis identifiant, une page de la taille demandée', async () => {
    prismaFactice.departement.count.mockResolvedValue(25)

    const resultat = await recupererEtablissementParIdPaged('e1', 2, 10)

    expect(lecture()).toEqual(
      expect.objectContaining({
        where: { etablissementId: 'e1' },
        orderBy: [{ nom: 'asc' }, { id: 'asc' }],
        skip: 10,
        take: 10,
      })
    )
    expect([resultat?.page, resultat?.totalPages, resultat?.total]).toEqual([2, 3, 25])
  })

  it('ramène une page trop grande à la dernière', async () => {
    prismaFactice.departement.count.mockResolvedValue(25)

    const resultat = await recupererEtablissementParIdPaged('e1', 999, 10)

    expect(lecture()).toEqual(expect.objectContaining({ skip: 20, take: 10 }))
    expect(resultat?.page).toBe(3)
  })

  it('renvoie null, sans rien compter de plus, quand l’établissement n’existe pas', async () => {
    prismaFactice.etablissement.findUnique.mockResolvedValue(null)

    expect(await recupererEtablissementParIdPaged('inconnu', 1, 10)).toBeNull()
    expect(prismaFactice.departement.findMany).not.toHaveBeenCalled()
  })

  it('une liste vide reste sur la page 1', async () => {
    prismaFactice.departement.count.mockResolvedValue(0)

    const resultat = await recupererEtablissementParIdPaged('e1', 5, 10)

    expect([resultat?.page, resultat?.totalPages]).toEqual([1, 1])
    expect(lecture()).toEqual(expect.objectContaining({ skip: 0 }))
  })
})
