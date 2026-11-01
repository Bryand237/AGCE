import { beforeEach, describe, expect, it, vi } from 'vitest'

// La base est simulée : on vérifie ce que la lecture demande et ce qu'elle renvoie, et surtout
// qu'elle n'écrit rien.
const { prismaFactice } = vi.hoisted(() => ({
  prismaFactice: {
    absence: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))

const { recupererStatsAbsences, recupererAbsences } = await import('./donnees')

const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const AUJOURDHUI = jour('2026-11-01')

type Ligne = {
  id: string
  statut: 'EN_ATTENTE' | 'EN_PERIODE' | 'DEPASSE' | 'TERMINE'
  dateDebut: Date
  dateFin: Date
}

const ligne = (id: string, statut: Ligne['statut'], debut: string, fin: string): Ligne => ({
  id,
  statut,
  dateDebut: jour(debut),
  dateFin: jour(fin),
})

/** Ce que la liste affiche pour une ligne (les colonnes de SELECTION_LISTE). */
const detail = (l: Ligne) => ({
  ...l,
  type: 'MISSION',
  enseignant: { id: `e-${l.id}`, nom: 'NOM', prenom: 'Prénom', matricule: `M-${l.id}` },
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('recupererStatsAbsences', () => {
  beforeEach(() => {
    prismaFactice.absence.count.mockResolvedValue(0)
  })

  it('compte les absences en période et dépassées d’après la date de fin, au jour donné', async () => {
    await recupererStatsAbsences(AUJOURDHUI)

    const filtres = prismaFactice.absence.count.mock.calls.map(([appel]) => appel?.where)
    // Validées (en période ou dépassées dans la base) et fin encore à venir ou atteinte…
    expect(filtres).toContainEqual({
      statut: { in: ['EN_PERIODE', 'DEPASSE'] },
      dateFin: { gte: AUJOURDHUI },
    })
    // … ou fin passée.
    expect(filtres).toContainEqual({
      statut: { in: ['EN_PERIODE', 'DEPASSE'] },
      dateFin: { lt: AUJOURDHUI },
    })
    expect(filtres).toContainEqual({ statut: 'EN_ATTENTE' })
  })

  it('renvoie les quatre compteurs', async () => {
    // Ordre des appels : total, en attente, en période, dépassées.
    prismaFactice.absence.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)

    expect(await recupererStatsAbsences(AUJOURDHUI)).toEqual({
      total: 12,
      enAttente: 3,
      enPeriode: 5,
      depasse: 2,
    })
  })

  it('n’écrit rien en base', async () => {
    await recupererStatsAbsences(AUJOURDHUI)

    expect(prismaFactice.absence.update).not.toHaveBeenCalled()
    expect(prismaFactice.absence.updateMany).not.toHaveBeenCalled()
  })
})

describe('recupererAbsences', () => {
  it('affiche « dépassé » pour une absence validée dont la fin est passée, sans écriture', async () => {
    const enRetard = ligne('a1', 'EN_PERIODE', '2026-10-01', '2026-10-20')
    prismaFactice.absence.findMany.mockResolvedValue([detail(enRetard)])
    prismaFactice.absence.count.mockResolvedValue(1)

    const { absences } = await recupererAbsences({ jour: AUJOURDHUI })

    expect(absences.map((a) => a.statut)).toEqual(['DEPASSE'])
    expect(prismaFactice.absence.updateMany).not.toHaveBeenCalled()
    expect(prismaFactice.absence.update).not.toHaveBeenCalled()
  })

  it('garde « en période » le dernier jour, et relit une ancienne valeur « dépassé » d’après les dates', async () => {
    prismaFactice.absence.findMany.mockResolvedValue([
      detail(ligne('dernier-jour', 'EN_PERIODE', '2026-10-20', '2026-11-01')),
      detail(ligne('repoussee', 'DEPASSE', '2026-10-01', '2026-12-01')),
      detail(ligne('attente', 'EN_ATTENTE', '2026-10-01', '2026-10-05')),
      detail(ligne('terminee', 'TERMINE', '2026-09-01', '2026-09-05')),
    ])
    prismaFactice.absence.count.mockResolvedValue(4)

    const { absences } = await recupererAbsences({ jour: AUJOURDHUI })

    expect(absences.map((a) => [a.id, a.statut])).toEqual([
      ['dernier-jour', 'EN_PERIODE'],
      ['repoussee', 'EN_PERIODE'],
      ['attente', 'EN_ATTENTE'],
      ['terminee', 'TERMINE'],
    ])
  })

  it('trie par date de début décroissante par défaut, en demandant une seule page à la base', async () => {
    prismaFactice.absence.findMany.mockResolvedValue([])
    prismaFactice.absence.count.mockResolvedValue(45)

    const { totalPages } = await recupererAbsences({ page: 2, jour: AUJOURDHUI })

    expect(prismaFactice.absence.findMany).toHaveBeenCalledTimes(1)
    expect(prismaFactice.absence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { dateDebut: 'desc' }, skip: 20, take: 20 })
    )
    expect(totalPages).toBe(3)
  })

  describe('tri par statut', () => {
    // Un melange où l'ordre enregistré (enum de la base) et l'ordre effectif diffèrent :
    // « retard » est enregistrée EN_PERIODE mais sa fin est passée.
    const melange = [
      ligne('terminee', 'TERMINE', '2026-09-01', '2026-09-05'),
      ligne('retard', 'EN_PERIODE', '2026-10-29', '2026-10-30'),
      ligne('attente', 'EN_ATTENTE', '2026-10-25', '2026-11-10'),
      ligne('en-cours', 'EN_PERIODE', '2026-10-28', '2026-11-05'),
      ligne('ancien-depasse', 'DEPASSE', '2026-08-01', '2026-08-15'),
    ]

    /** findMany : d'abord les colonnes de tri (toute la sélection), puis le détail des lignes demandées. */
    function simulerLaBase(lignes: Ligne[]) {
      prismaFactice.absence.findMany.mockImplementation(
        async (demande: { where?: { id?: { in: string[] } } }) => {
          const ids = demande.where?.id?.in
          if (!ids) return lignes
          // La base ne garantit pas l'ordre d'un « in » : on le renverse exprès.
          return lignes
            .filter((l) => ids.includes(l.id))
            .map(detail)
            .reverse()
        }
      )
    }

    it('range par statut EFFECTIF : en attente, en période, dépassées, terminées', async () => {
      simulerLaBase(melange)

      const { absences } = await recupererAbsences({ tri: 'statut', jour: AUJOURDHUI })

      expect(absences.map((a) => [a.id, a.statut])).toEqual([
        ['attente', 'EN_ATTENTE'],
        ['en-cours', 'EN_PERIODE'],
        // Dans un même statut, les plus récentes d'abord.
        ['retard', 'DEPASSE'],
        ['ancien-depasse', 'DEPASSE'],
        ['terminee', 'TERMINE'],
      ])
    })

    it('ne charge en détail que les lignes de la page demandée', async () => {
      const beaucoup = Array.from({ length: 25 }, (_, n) =>
        ligne(`a${String(n).padStart(2, '0')}`, 'EN_PERIODE', '2026-10-01', '2026-11-20')
      )
      simulerLaBase(beaucoup)

      const { absences, totalPages } = await recupererAbsences({
        tri: 'statut',
        page: 2,
        jour: AUJOURDHUI,
      })

      expect(absences).toHaveLength(5)
      expect(totalPages).toBe(2)
      const demandeDetail = prismaFactice.absence.findMany.mock.calls[1]![0]
      expect(demandeDetail.where.id.in).toHaveLength(5)
    })

    it('départage les statuts égaux et les dates égales par l’identifiant : l’ordre est stable', async () => {
      simulerLaBase([
        ligne('b', 'EN_PERIODE', '2026-10-01', '2026-11-20'),
        ligne('a', 'EN_PERIODE', '2026-10-01', '2026-11-20'),
      ])

      const { absences } = await recupererAbsences({ tri: 'statut', jour: AUJOURDHUI })

      expect(absences.map((a) => a.id)).toEqual(['a', 'b'])
    })

    it('applique la recherche aux deux lectures et ne modifie rien', async () => {
      simulerLaBase(melange)

      await recupererAbsences({ tri: 'statut', recherche: 'mbala', jour: AUJOURDHUI })

      const premiere = prismaFactice.absence.findMany.mock.calls[0]![0]
      expect(premiere.where.OR).toHaveLength(2)
      expect(prismaFactice.absence.update).not.toHaveBeenCalled()
      expect(prismaFactice.absence.updateMany).not.toHaveBeenCalled()
    })
  })
})
