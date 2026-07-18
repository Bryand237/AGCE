import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const ROUTES_PUBLIQUES = ['/connexion']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (ROUTES_PUBLIQUES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value
  if (!token) return NextResponse.redirect(new URL('/connexion', request.url))

  // Next.js 16 : proxy.ts tourne sur le runtime Node.js — une vraie
  // vérification en base est possible ici, pas seulement un contrôle
  // de présence du cookie comme ç'aurait été le cas sur d'anciennes
  // versions (edge runtime, incompatible avec Prisma).
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) {
    const reponse = NextResponse.redirect(new URL('/connexion', request.url))
    reponse.cookies.delete('session')
    return reponse
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}