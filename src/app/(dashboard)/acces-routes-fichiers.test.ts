import { beforeEach, describe, expect, it, vi } from 'vitest'

// Chaque route de téléchargement doit refuser une requête sans session AVANT de
// toucher à la base ou de fabriquer le moindre document. Le proxy (src/proxy.ts)
// est le premier verrou ; ces routes sont le second, indépendant de lui.
const { refuserSiNonConnecte, prismaFactice, genererListeEnseignantsPdf, genererPdf } = vi.hoisted(
  () => ({
    refuserSiNonConnecte: vi.fn(),
    prismaFactice: {
      sessionConseil: { findUnique: vi.fn() },
      historiqueAvancement: { findUnique: vi.fn() },
      absence: { findUnique: vi.fn() },
    },
    genererListeEnseignantsPdf: vi.fn(),
    genererPdf: vi.fn(),
  })
)

vi.mock('@/lib/auth', () => ({ refuserSiNonConnecte }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('@/lib/pdf/genererPdf', () => ({ genererPdf }))
vi.mock('@/lib/pdf/logo', () => ({ lireLogo: () => null }))
vi.mock('./enseignants/liste-pdf', () => ({ genererListeEnseignantsPdf }))

const { GET: listeEnseignants } = await import('./enseignants/liste-pdf/route')
const { GET: rapport } = await import('./avancements/[id]/rapport-pdf/route')
const { GET: decision } = await import('./avancements/[id]/[avancementId]/decision/route')
const { GET: attestation } = await import('./absences/[id]/attestation/route')

const requete = new Request('http://localhost:3000/telechargement')
const ID = '00000000-0000-0000-0000-000000000000'

const ROUTES: Array<[string, () => Promise<Response>]> = [
  ['liste des enseignants', () => listeEnseignants()],
  ['rapport PDF', () => rapport(requete, { params: Promise.resolve({ id: ID }) })],
  [
    'décision d’avancement',
    () => decision(requete, { params: Promise.resolve({ avancementId: ID }) }),
  ],
  ['attestation d’absence', () => attestation(requete, { params: Promise.resolve({ id: ID }) })],
]

function nombreDAccesAuxDonnees() {
  return (
    prismaFactice.sessionConseil.findUnique.mock.calls.length +
    prismaFactice.historiqueAvancement.findUnique.mock.calls.length +
    prismaFactice.absence.findUnique.mock.calls.length +
    genererListeEnseignantsPdf.mock.calls.length +
    genererPdf.mock.calls.length
  )
}

describe('routes de téléchargement — accès', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(null)
    prismaFactice.historiqueAvancement.findUnique.mockResolvedValue(null)
    prismaFactice.absence.findUnique.mockResolvedValue(null)
    genererListeEnseignantsPdf.mockResolvedValue(Buffer.from('%PDF-1.4'))
  })

  it.each(ROUTES)(
    '%s : répond 401 sans consulter la base ni produire de document quand personne n’est connecté',
    async (_nom, appeler) => {
      refuserSiNonConnecte.mockResolvedValue(
        Response.json({ message: 'Connexion requise.' }, { status: 401 })
      )

      const reponse = await appeler()

      expect(reponse.status).toBe(401)
      expect(nombreDAccesAuxDonnees()).toBe(0)
    }
  )

  it.each(ROUTES)('%s : accède aux données quand la session est valide', async (_nom, appeler) => {
    refuserSiNonConnecte.mockResolvedValue(null)

    await appeler()

    expect(refuserSiNonConnecte).toHaveBeenCalledTimes(1)
    expect(nombreDAccesAuxDonnees()).toBeGreaterThan(0)
  })
})
