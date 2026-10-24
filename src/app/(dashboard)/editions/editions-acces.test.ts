import { beforeEach, describe, expect, it, vi } from 'vitest'

// Les listes officielles (PDF et CSV) refusent une requête sans session AVANT de lire la base ou
// de fabriquer le moindre document : le proxy (src/proxy.ts) est le premier verrou, ces routes
// le second. Une liste inconnue ou une année invalide est refusée, jamais « rattrapée ».
const { refuserSiNonConnecte, chargerEdition, genererPdf } = vi.hoisted(() => ({
  refuserSiNonConnecte: vi.fn(),
  chargerEdition: vi.fn(),
  genererPdf: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ refuserSiNonConnecte }))
vi.mock('@/lib/editions/chargerEdition', () => ({ chargerEdition }))
vi.mock('@/lib/pdf/genererPdf', () => ({ genererPdf }))
vi.mock('@/lib/prisma', () => ({ prisma: { session: { findUnique: vi.fn() } } }))

const { GET: editionPdf } = await import('./[edition]/pdf/route')
const { GET: editionCsv } = await import('./[edition]/csv/route')
const { config } = await import('@/proxy')

const JOUR = new Date('2026-10-23T00:00:00Z')
type Appel = (
  requete: Request,
  contexte: { params: Promise<{ edition: string }> }
) => Promise<Response>

const appeler = (route: Appel, edition: string, parametres = '') =>
  route(
    new Request(
      `http://localhost:3000/editions/${edition}/x${parametres === '' ? '' : `?${parametres}`}`
    ),
    { params: Promise.resolve({ edition }) }
  )

const ROUTES: Array<[string, string, Appel]> = [
  ['PDF', 'pdf', editionPdf],
  ['CSV', 'csv', editionCsv],
]

describe.each(ROUTES)('liste officielle en %s', (_nom, format, route) => {
  beforeEach(() => {
    vi.clearAllMocks()
    refuserSiNonConnecte.mockResolvedValue(null)
    chargerEdition.mockResolvedValue({ lignes: [], jour: JOUR })
    genererPdf.mockResolvedValue(Buffer.from('%PDF-1.4'))
  })

  it('répond 401 sans lire la base ni produire de document quand personne n’est connecté', async () => {
    refuserSiNonConnecte.mockResolvedValue(
      Response.json({ message: 'Connexion requise.' }, { status: 401 })
    )

    const reponse = await appeler(route, 'retraite', 'annee=2027')

    expect(reponse.status).toBe(401)
    expect(chargerEdition).not.toHaveBeenCalled()
    expect(genererPdf).not.toHaveBeenCalled()
  })

  it('répond 404 pour une liste inconnue, sans rien charger', async () => {
    const reponse = await appeler(route, 'mystere', 'annee=2027')

    expect(reponse.status).toBe(404)
    expect(await reponse.text()).toBe('Liste inconnue : « mystere ».')
    expect(chargerEdition).not.toHaveBeenCalled()
    expect(genererPdf).not.toHaveBeenCalled()
  })

  it.each(['', 'annee=', 'annee=abc', 'annee=27', 'annee=1800', 'annee=2027.5'])(
    'répond 400 pour une année absente ou invalide (%j), sans rien charger',
    async (requete) => {
      const reponse = await appeler(route, 'retraite', requete)

      expect(reponse.status).toBe(400)
      expect(reponse.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
      expect(await reponse.text()).toContain('Année invalide')
      expect(chargerEdition).not.toHaveBeenCalled()
      expect(genererPdf).not.toHaveBeenCalled()
    }
  )

  it('charge la liste de l’année demandée et ignore les paramètres inconnus', async () => {
    const reponse = await appeler(route, 'retraite', 'annee=2027&page=7&statut=ACTIF')

    expect(reponse.status).toBe(200)
    expect(chargerEdition).toHaveBeenCalledTimes(1)
    expect(chargerEdition).toHaveBeenCalledWith({ cle: 'retraite', annee: 2027 })
  })

  it.each(['transferes', 'collaboration'] as const)(
    'la liste « %s » se télécharge sans paramètre et ignore ceux qu’on lui ajoute',
    async (cle) => {
      for (const parametres of ['', 'annee=abc&page=3']) {
        chargerEdition.mockClear()
        const reponse = await appeler(route, cle, parametres)

        expect(reponse.status).toBe(200)
        expect(chargerEdition).toHaveBeenCalledWith({ cle })
        expect(reponse.headers.get('Content-Disposition')).toBe(
          `attachment; filename="${cle}_edition-2026-10-23.${format}"`
        )
      }
    }
  )

  it.each(['retraite', 'transferes', 'collaboration'])(
    'la liste « %s » est contrôlée par le proxy (connexion exigée)',
    (cle) => {
      const source = config.matcher[0] as string
      expect(new RegExp(`^${source}$`).test(`/editions/${cle}/${format}`)).toBe(true)
    }
  )
})

describe('en-têtes de réponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    refuserSiNonConnecte.mockResolvedValue(null)
    chargerEdition.mockResolvedValue({ lignes: [], jour: JOUR })
    genererPdf.mockResolvedValue(Buffer.from('%PDF-1.4'))
  })

  it('le PDF est un téléchargement nommé d’après la liste, l’année et le jour', async () => {
    const reponse = await appeler(editionPdf, 'retraite', 'annee=2027')

    expect(reponse.headers.get('Content-Type')).toBe('application/pdf')
    expect(reponse.headers.get('Content-Disposition')).toBe(
      'attachment; filename="retraites-2027_edition-2026-10-23.pdf"'
    )
    expect(genererPdf).toHaveBeenCalledWith(
      expect.stringContaining('Aucun enseignant à la retraite en 2027.'),
      { paysage: true }
    )
  })

  it('le CSV est un téléchargement en UTF-8 avec les en-têtes', async () => {
    const reponse = await appeler(editionCsv, 'retraite', 'annee=2027')

    expect(reponse.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(reponse.headers.get('Content-Disposition')).toBe(
      'attachment; filename="retraites-2027_edition-2026-10-23.csv"'
    )
    // On lit les octets : `Response.text()` retire le BOM selon l'implémentation.
    const octets = new Uint8Array(await reponse.arrayBuffer())
    expect(Array.from(octets.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])
    const texte = new TextDecoder('utf-8', { ignoreBOM: true }).decode(octets)
    expect(texte.startsWith('﻿Établissement;Nom et prénom;')).toBe(true)
  })
})
