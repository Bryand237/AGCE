import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

// Base et Next.js sont simulés : on vérifie la décision du proxy (laisser passer
// ou renvoyer vers /connexion), pas le moteur de Next.js.
const { prismaFactice } = vi.hoisted(() => ({
  prismaFactice: { session: { findUnique: vi.fn() } },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('next/server', () => {
  const reponse = (type: string, url?: string) => ({ type, url, cookies: { delete: vi.fn() } })
  return {
    NextResponse: {
      next: () => reponse('next'),
      redirect: (url: URL) => reponse('redirect', url.toString()),
    },
  }
})

const { proxy, config } = await import('./proxy')

type ReponseFactice = { type: string; url?: string; cookies: { delete: ReturnType<typeof vi.fn> } }

function requete(chemin: string, session?: string) {
  return {
    nextUrl: { pathname: chemin },
    url: `http://localhost:3000${chemin}`,
    cookies: {
      get: (nom: string) => (nom === 'session' && session ? { value: session } : undefined),
    },
  } as unknown as NextRequest
}

async function appeler(chemin: string, session?: string) {
  return (await proxy(requete(chemin, session))) as unknown as ReponseFactice
}

describe('proxy — contrôle d’accès', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('laisse passer la page de connexion sans cookie', async () => {
    const reponse = await appeler('/connexion')

    expect(reponse.type).toBe('next')
    expect(prismaFactice.session.findUnique).not.toHaveBeenCalled()
  })

  it.each([
    '/',
    '/enseignants',
    '/enseignants/liste-pdf',
    '/avancements/r-1/rapport-pdf',
    '/avancements/r-1/a-1/decision',
    '/absences/x-1/attestation',
  ])(
    'renvoie vers /connexion, sans consulter la base, quand il n’y a pas de cookie : %s',
    async (chemin) => {
      const reponse = await appeler(chemin)

      expect(reponse.type).toBe('redirect')
      expect(reponse.url).toBe('http://localhost:3000/connexion')
      expect(prismaFactice.session.findUnique).not.toHaveBeenCalled()
    }
  )

  it('renvoie vers /connexion et efface le cookie quand la session est inconnue', async () => {
    prismaFactice.session.findUnique.mockResolvedValue(null)

    const reponse = await appeler('/enseignants', 'jeton-inconnu')

    expect(reponse.type).toBe('redirect')
    expect(reponse.cookies.delete).toHaveBeenCalledWith('session')
  })

  it('renvoie vers /connexion et efface le cookie quand la session a expiré', async () => {
    prismaFactice.session.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000) })

    const reponse = await appeler('/enseignants/liste-pdf', 'jeton-expire')

    expect(reponse.type).toBe('redirect')
    expect(reponse.cookies.delete).toHaveBeenCalledWith('session')
  })

  it('laisse passer une session valide', async () => {
    prismaFactice.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    const reponse = await appeler('/enseignants/liste-pdf', 'jeton-valide')

    expect(reponse.type).toBe('next')
    expect(prismaFactice.session.findUnique).toHaveBeenCalledWith({
      where: { token: 'jeton-valide' },
    })
  })
})

describe('proxy — chemins concernés (matcher)', () => {
  // Next.js lit chaque entrée du matcher comme une expression de chemin ; la partie
  // entre parenthèses est une expression régulière ordinaire, ancrée au chemin entier.
  const source = config.matcher[0] as string
  const concerne = (chemin: string) => new RegExp(`^${source}$`).test(chemin)

  it.each([
    '/',
    '/enseignants',
    '/enseignants/liste-pdf',
    '/avancements/r-1/rapport-pdf',
    '/avancements/r-1/a-1/decision',
    '/absences/x-1/attestation',
  ])('contrôle %s', (chemin) => {
    expect(concerne(chemin)).toBe(true)
  })

  it.each([
    '/_next/static/chunks/app.js',
    '/_next/image',
    '/favicon.ico',
    '/uploads/enseignants/photo.jpeg',
  ])('ne contrôle pas %s (nécessaire au fonctionnement de l’affichage)', (chemin) => {
    expect(concerne(chemin)).toBe(false)
  })

  it('ne dispense pas un chemin qui contient seulement le mot « uploads »', () => {
    expect(concerne('/enseignants/uploads')).toBe(true)
    expect(concerne('/uploads')).toBe(true)
  })
})

// Cause racine de B1 : Next.js ne lit le proxy que s'il est à la même hauteur que
// le dossier app. Ici l'application vit dans src/app : un proxy.ts à la racine du
// dépôt est ignoré sans aucun message, et plus rien n'est protégé.
describe('proxy — emplacement du fichier', () => {
  // Même méthode que src/app/directives.test.ts : partir du chemin du fichier de test
  // (new URL(...) donne un objet que fileURLToPath refuse dans l'environnement jsdom).
  const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

  it('se trouve dans src/, à côté de app', () => {
    expect(existsSync(join(racine, 'src', 'proxy.ts'))).toBe(true)
  })

  it('n’existe pas aussi à la racine du dépôt', () => {
    expect(existsSync(join(racine, 'proxy.ts'))).toBe(false)
  })

  it('n’est pas doublé par un ancien fichier middleware (Next.js 16 refuse les deux)', () => {
    expect(existsSync(join(racine, 'middleware.ts'))).toBe(false)
    expect(existsSync(join(racine, 'src', 'middleware.ts'))).toBe(false)
  })
})
