import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export function determinerDestinationInitiale(utilisateur: unknown | null) {
  return utilisateur ? '/dashboard' : '/connexion'
}

export async function recupererUtilisateurConnecte() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { utilisateur: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  return session.utilisateur
}
