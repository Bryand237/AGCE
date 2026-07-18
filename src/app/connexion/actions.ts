'use server'

import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export type EtatFormulaire = { message?: string }

const DUREE_SESSION_HEURES = 12
const DUREE_SESSION_SOUVENIR_HEURES = 24 * 30

export async function seConnecter(_prevState: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const nomUtilisateur = formData.get('nomUtilisateur') as string
  const motDePasse = formData.get('motDePasse') as string
  const seSouvenir = formData.get('seSouvenir') === 'on'

  const utilisateur = await prisma.utilisateur.findUnique({ where: { nomUtilisateur } })
  // Comparaison systématique même si l'utilisateur n'existe pas, pour ne
  // pas révéler par le temps de réponse si le nom d'utilisateur est valide.
  const hashReference = utilisateur?.motDePasseHash ?? '$2a$12$invalidplaceholderhashvalueinvalidplaceholder'
  const motDePasseValide = await bcrypt.compare(motDePasse, hashReference)

  if (!utilisateur || !motDePasseValide) {
    return { message: 'Identifiants incorrects.' }
  }

  const token = randomBytes(32).toString('hex')
  const dureeHeures = seSouvenir ? DUREE_SESSION_SOUVENIR_HEURES : DUREE_SESSION_HEURES
  const expiresAt = new Date(Date.now() + dureeHeures * 60 * 60 * 1000)

  await prisma.session.create({ data: { token, utilisateurId: utilisateur.id, expiresAt } })

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  redirect('/etablissements')
}

export async function seDeconnecter(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (token) await prisma.session.deleteMany({ where: { token } })
  cookieStore.delete('session')
  redirect('/connexion')
}