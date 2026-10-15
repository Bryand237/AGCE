import { beforeEach, describe, expect, it, vi } from 'vitest'

// Le moteur PDF (Chromium) et la base sont simulés : on vérifie le HTML que la
// route fabrique et ce qu'elle répond, pas le rendu final du PDF.
const { prismaFactice, genererPdf, lireLogo } = vi.hoisted(() => ({
  prismaFactice: { sessionConseil: { findUnique: vi.fn() } },
  genererPdf: vi.fn(async (_html: string) => Buffer.from('%PDF-1.4')),
  lireLogo: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('@/lib/pdf/genererPdf', () => ({ genererPdf }))
vi.mock('@/lib/pdf/logo', () => ({ lireLogo }))
vi.mock('next/server', () => ({
  NextResponse: class {
    constructor(
      readonly corps: unknown,
      readonly init?: { status?: number; headers?: Record<string, string> }
    ) {}
  },
}))

const { GET } = await import('./route')

const RAPPORT = {
  id: 'r-1',
  numero: '56',
  periodeDebut: new Date('2024-01-01'),
  periodeFin: new Date('2024-06-30'),
  selections: [],
  avancements: [],
}

function appeler() {
  return GET(new Request('http://localhost/avancements/r-1/rapport-pdf'), {
    params: Promise.resolve({ id: 'r-1' }),
  })
}

function htmlEnvoye(): string {
  return String(genererPdf.mock.calls[0]?.[0])
}

describe('GET /avancements/[id]/rapport-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(RAPPORT)
  })

  it('produit le PDF sans logo, sans erreur, quand le logo est absent', async () => {
    lireLogo.mockReturnValue(null)

    const reponse = (await appeler()) as unknown as { init: { headers: Record<string, string> } }

    expect(genererPdf).toHaveBeenCalledTimes(1)
    expect(htmlEnvoye()).not.toContain('<img')
    expect(htmlEnvoye()).toContain("CONSEIL DE L'UNIVERSITÉ DE NGAOUNDÉRÉ")
    expect(reponse.init.headers['Content-Type']).toBe('application/pdf')
  })

  it('place le logo dans l’en-tête quand il existe', async () => {
    lireLogo.mockReturnValue('data:image/jpeg;base64,AAAA')

    await appeler()

    expect(htmlEnvoye()).toContain('<img src="data:image/jpeg;base64,AAAA"')
  })

  it('répond 404 pour un rapport inexistant', async () => {
    prismaFactice.sessionConseil.findUnique.mockResolvedValue(null)

    const reponse = (await appeler()) as unknown as { init: { status: number } }

    expect(reponse.init.status).toBe(404)
    expect(genererPdf).not.toHaveBeenCalled()
  })
})
