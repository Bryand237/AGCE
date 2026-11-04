'use server'

import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { cookieSessionSecurise } from '@/lib/session-cookie'
import { cleLimite, limiteConnexions, messageBlocage } from '@/lib/connexion/limite-tentatives'
import { verifierMotDePasse } from '@/lib/connexion/mot-de-passe'
import { purgerSessionsExpirees } from '@/lib/connexion/sessions'
import { SaisieConnexionSchema } from '@/lib/validations/connexion'
import type { EtatFormulaire } from '@/lib/formulaires'

const DUREE_SESSION_HEURES = 12
const DUREE_SESSION_SOUVENIR_HEURES = 24 * 30

// Le même texte pour un identifiant inconnu, un mauvais mot de passe ou un formulaire incomplet :
// la réponse ne dit pas lequel des deux est faux.
const IDENTIFIANTS_INCORRECTS = 'Identifiants incorrects.'

export async function seConnecter(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  const saisie = SaisieConnexionSchema.safeParse({
    nomUtilisateur: formData.get('nomUtilisateur'),
    motDePasse: formData.get('motDePasse'),
    seSouvenir: formData.get('seSouvenir'),
  })
  if (!saisie.success) return { message: IDENTIFIANTS_INCORRECTS }
  const { nomUtilisateur, motDePasse, seSouvenir } = saisie.data

  // Limite d'essais, contrôlée avant tout calcul : un compte bloqué ne coûte rien au serveur.
  // La tentative est comptée tout de suite, avant la vérification (qui prend une fraction de
  // seconde) : cinq requêtes envoyées ensemble ne passent pas toutes.
  const cle = cleLimite(nomUtilisateur)
  const verdict = limiteConnexions.verifier(cle)
  if (verdict.bloque) return { message: messageBlocage(verdict.reessayerDansMs) }
  limiteConnexions.compter(cle)

  const utilisateur = await prisma.utilisateur.findUnique({ where: { nomUtilisateur } })
  // Comparaison systématique, même si l'utilisateur n'existe pas, pour ne pas révéler par le
  // temps de réponse si l'identifiant est valide (voir verifierMotDePasse).
  const motDePasseValide = await verifierMotDePasse(motDePasse, utilisateur?.motDePasseHash)

  if (!utilisateur || !motDePasseValide) {
    return { message: IDENTIFIANTS_INCORRECTS }
  }
  limiteConnexions.reinitialiser(cle)

  const token = randomBytes(32).toString('hex')
  const dureeHeures = seSouvenir ? DUREE_SESSION_SOUVENIR_HEURES : DUREE_SESSION_HEURES
  const expiresAt = new Date(Date.now() + dureeHeures * 60 * 60 * 1000)

  await prisma.session.create({ data: { token, utilisateurId: utilisateur.id, expiresAt } })
  await purgerSessionsExpirees(prisma)

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: cookieSessionSecurise(),
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  redirect('/dashboard')
}

export async function seDeconnecter(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (token) await prisma.session.deleteMany({ where: { token } })
  cookieStore.delete('session')
  redirect('/connexion')
}
