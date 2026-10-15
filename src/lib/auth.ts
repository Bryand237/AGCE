import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

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

/**
 * Pour les routes de téléchargement (GET) : renvoie une réponse 401 si personne n'est
 * connecté, ou null si la session est valide. À appeler en première ligne :
 *
 *   const refus = await refuserSiNonConnecte()
 *   if (refus) return refus
 *
 * Le proxy (src/proxy.ts) bloque déjà ces adresses ; ce contrôle est le second verrou,
 * qui joue encore si le proxy est contourné, désactivé ou déplacé par erreur.
 */
export async function refuserSiNonConnecte(): Promise<Response | null> {
  const utilisateur = await recupererUtilisateurConnecte()
  if (utilisateur) return null
  return Response.json({ message: 'Connexion requise.' }, { status: 401 })
}

/**
 * Pour les actions serveur : renvoie l'utilisateur connecté, ou renvoie vers /connexion.
 * À appeler en TOUTE PREMIÈRE ligne de chaque action exportée, avant de lire le formulaire
 * ou d'interroger la base :
 *
 *   export async function creerAbsence(...) {
 *     await exigerUtilisateur()
 *     ...
 *
 * Pourquoi : une action serveur est une adresse HTTP appelable sans passer par la page qui
 * l'affiche. Le layout du tableau de bord ne protège que l'affichage, et le proxy ne voit
 * pas toujours ces appels (Next.js demande de vérifier la session dans chaque action).
 *
 * redirect() interrompt l'exécution en levant une exception : cet appel ne doit jamais
 * être placé dans un try/catch qui l'avalerait.
 */
export async function exigerUtilisateur() {
  const utilisateur = await recupererUtilisateurConnecte()
  if (!utilisateur) redirect('/connexion')
  return utilisateur
}
