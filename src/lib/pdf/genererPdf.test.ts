import { beforeEach, describe, expect, it, vi } from 'vitest'

// Chromium est simulé : on vérifie comment le navigateur est utilisé (JavaScript coupé,
// navigateur toujours refermé), pas le rendu du PDF.
const { lancer, navigateur, contexte, page } = vi.hoisted(() => {
  const page = { setContent: vi.fn(), pdf: vi.fn() }
  const contexte = { newPage: vi.fn() }
  const navigateur = { newContext: vi.fn(), newPage: vi.fn(), close: vi.fn() }
  return { lancer: vi.fn(), navigateur, contexte, page }
})

vi.mock('playwright', () => ({
  chromium: { launch: lancer, executablePath: () => '' },
}))

const { genererPdf } = await import('./genererPdf')

beforeEach(() => {
  vi.clearAllMocks()
  lancer.mockResolvedValue(navigateur)
  navigateur.newContext.mockResolvedValue(contexte)
  contexte.newPage.mockResolvedValue(page)
  page.setContent.mockResolvedValue(undefined)
  page.pdf.mockResolvedValue(Buffer.from('%PDF-1.4'))
  navigateur.close.mockResolvedValue(undefined)
})

describe('genererPdf', () => {
  it('coupe JavaScript dans la page : un script glissé dans le HTML ne s’exécute pas', async () => {
    await genererPdf('<p>bonjour</p>')

    expect(navigateur.newContext).toHaveBeenCalledWith({ javaScriptEnabled: false })
    // La page vient du contexte sans JavaScript, jamais directement du navigateur.
    expect(contexte.newPage).toHaveBeenCalledTimes(1)
    expect(navigateur.newPage).not.toHaveBeenCalled()
  })

  it('envoie le HTML tel quel à la page et rend le PDF', async () => {
    const pdf = await genererPdf('<p>bonjour</p>', { paysage: true })

    expect(page.setContent).toHaveBeenCalledWith('<p>bonjour</p>', { waitUntil: 'networkidle' })
    expect(page.pdf).toHaveBeenCalledWith(expect.objectContaining({ landscape: true }))
    expect(pdf.toString()).toBe('%PDF-1.4')
  })

  it('referme le navigateur même quand la production du PDF échoue', async () => {
    page.pdf.mockRejectedValue(new Error('Chromium a planté'))

    await expect(genererPdf('<p>x</p>')).rejects.toThrow('Chromium a planté')
    expect(navigateur.close).toHaveBeenCalledTimes(1)
  })
})
