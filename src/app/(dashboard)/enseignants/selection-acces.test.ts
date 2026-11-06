import { beforeEach, describe, expect, it, vi } from 'vitest'

// Les exports de la sélection (PDF et CSV) refusent une requête sans session AVANT de lire la
// base ou de fabriquer le moindre document : le proxy (src/proxy.ts) est le premier verrou,
// ces routes le second.
const { refuserSiNonConnecte, chargerSelection, genererPdf } = vi.hoisted(() => ({
  refuserSiNonConnecte: vi.fn(),
  chargerSelection: vi.fn(),
  genererPdf: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ refuserSiNonConnecte }))
vi.mock('@/lib/enseignants/selection', () => ({ chargerSelection }))
vi.mock('@/lib/pdf/genererPdf', () => ({ genererPdf }))
vi.mock('@/lib/prisma', () => ({ prisma: { session: { findUnique: vi.fn() } } }))

const { GET: selectionPdf } = await import('./selection-pdf/route')
const { GET: selectionCsv } = await import('./selection-csv/route')
const { config } = await import('@/proxy')

const JOUR = new Date('2026-10-23T00:00:00Z')
const adresse = (chemin: string, parametres = '') =>
  new Request(`http://localhost:3000${chemin}${parametres === '' ? '' : `?${parametres}`}`)

const ROUTES: Array<[string, string, (r: Request) => Promise<Response>]> = [
  ['PDF', '/enseignants/selection-pdf', selectionPdf],
  ['CSV', '/enseignants/selection-csv', selectionCsv],
]

describe.each(ROUTES)('export %s de la sélection', (_nom, chemin, appeler) => {
  beforeEach(() => {
    vi.clearAllMocks()
    chargerSelection.mockResolvedValue({ lignes: [], puces: [], jour: JOUR })
    genererPdf.mockResolvedValue(Buffer.from('%PDF-1.4'))
  })

  it('répond 401 sans lire la base ni produire de document quand personne n’est connecté', async () => {
    refuserSiNonConnecte.mockResolvedValue(
      Response.json({ message: 'Connexion requise.' }, { status: 401 })
    )

    const reponse = await appeler(adresse(chemin, 'statut=ACTIF'))

    expect(reponse.status).toBe(401)
    expect(chargerSelection).not.toHaveBeenCalled()
    expect(genererPdf).not.toHaveBeenCalled()
  })

  it('exporte les filtres de l’adresse et ignore la page demandée', async () => {
    refuserSiNonConnecte.mockResolvedValue(null)

    await appeler(adresse(chemin, 'statut=ACTIF&retraiteEcheance=passee&trier=retraite&page=7'))

    expect(chargerSelection).toHaveBeenCalledTimes(1)
    const filtres = chargerSelection.mock.calls[0]![0]
    expect(filtres.statuts).toEqual(['ACTIF'])
    expect(filtres.retraite).toEqual({ echeance: 'passee' })
    expect(filtres.tri).toBe('retraite')
  })

  it('tolère une adresse aux paramètres invalides', async () => {
    refuserSiNonConnecte.mockResolvedValue(null)

    const reponse = await appeler(adresse(chemin, 'statut=nimporte&page=abc&absenceEtat=zzz'))

    expect(reponse.status).toBe(200)
    expect(chargerSelection.mock.calls[0]![0].statuts).toEqual([])
  })

  it('est contrôlée par le proxy (connexion exigée)', () => {
    const source = config.matcher[0] as string
    expect(new RegExp(`^${source}$`).test(chemin)).toBe(true)
  })
})

describe('en-têtes de réponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    refuserSiNonConnecte.mockResolvedValue(null)
    chargerSelection.mockResolvedValue({ lignes: [], puces: [], jour: JOUR })
    genererPdf.mockResolvedValue(Buffer.from('%PDF-1.4'))
  })

  it('le PDF est un téléchargement nommé d’après le jour', async () => {
    const reponse = await selectionPdf(adresse('/enseignants/selection-pdf'))
    expect(reponse.headers.get('Content-Type')).toBe('application/pdf')
    expect(reponse.headers.get('Content-Disposition')).toBe(
      'attachment; filename="selection-enseignants-2026-10-23.pdf"'
    )
    expect(genererPdf).toHaveBeenCalledWith(expect.stringContaining('Aucun enseignant'), {
      paysage: true,
    })
  })

  it('le CSV est un téléchargement en UTF-8 avec les en-têtes', async () => {
    const reponse = await selectionCsv(adresse('/enseignants/selection-csv'))
    expect(reponse.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(reponse.headers.get('Content-Disposition')).toBe(
      'attachment; filename="selection-enseignants-2026-10-23.csv"'
    )
    // On lit les octets : `Response.text()` retire le BOM selon l'implémentation (Node, Bun), alors
    // que c'est bien lui qu'Excel attend en tête du fichier pour reconnaître l'UTF-8.
    const octets = new Uint8Array(await reponse.arrayBuffer())
    expect(Array.from(octets.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])
    const texte = new TextDecoder('utf-8', { ignoreBOM: true }).decode(octets)
    expect(texte.startsWith('﻿Matricule;Nom;Prénom')).toBe(true)
  })
})
