import { beforeEach, describe, expect, it, vi } from 'vitest'

const { lireImage } = vi.hoisted(() => ({ lireImage: vi.fn() }))
vi.mock('@/lib/televersement', () => ({ lireImage }))

const { GET } = await import('./route')

const appeler = (chemin: string[]) =>
  GET(new Request('http://localhost/uploads/x'), { params: Promise.resolve({ chemin }) })

describe('GET /uploads/<dossier>/<fichier>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sert l’image avec son vrai type, nosniff et une durée de cache', async () => {
    const octets = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
    lireImage.mockResolvedValue({ octets, type: 'image/png' })

    const reponse = await appeler(['enseignants', 'a-2026.png'])

    expect(lireImage).toHaveBeenCalledWith('enseignants', 'a-2026.png')
    expect(reponse.status).toBe(200)
    expect(reponse.headers.get('Content-Type')).toBe('image/png')
    expect(reponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(reponse.headers.get('Cache-Control')).toMatch(/max-age=\d+/)
    expect(Buffer.from(await reponse.arrayBuffer()).equals(octets)).toBe(true)
  })

  it('répond 404 quand le fichier n’existe pas ou n’est pas une image', async () => {
    lireImage.mockResolvedValue(null)

    expect((await appeler(['enseignants', 'absent.png'])).status).toBe(404)
  })

  it.each([[[]], [['enseignants']], [['enseignants', 'a', 'b.png']], [['..', 'secret.png']]])(
    'répond 404 sans même chercher sur le disque pour le chemin %j',
    async (chemin) => {
      lireImage.mockResolvedValue(null)

      const reponse = await appeler(chemin)

      expect(reponse.status).toBe(404)
      if (chemin.length !== 2) expect(lireImage).not.toHaveBeenCalled()
    }
  )
})
