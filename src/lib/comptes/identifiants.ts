import bcrypt from 'bcryptjs'
import type { PrismaClient } from '@/generated/prisma/client'

/**
 * Identifiants de connexion : modification et rétablissement des identifiants initiaux.
 *
 * Ce fichier sert à la fois à la page « Mon compte » (actions serveur) et au script
 * `npm run admin:reset` : un seul endroit sait comment un mot de passe est haché et quelles
 * sessions sont fermées. Il n'importe que des TYPES du client Prisma, donc le script peut le
 * charger sans passer par les alias de Next.js.
 *
 * Les « identifiants initiaux » sont ceux du fichier `.env` (ADMIN_USERNAME, ADMIN_PASSWORD),
 * les mêmes que ceux créés par le seed.
 */

/** Même coût que le seed (prisma/seed.ts) : les deux produisent des empreintes équivalentes. */
export const COUT_BCRYPT = 12

export type IdentifiantsInitiaux = { nomUtilisateur: string; motDePasse: string }

type Client = Pick<PrismaClient, 'utilisateur' | 'session' | '$transaction'>

/** Les identifiants du fichier `.env`, ou `null` s'ils n'y sont pas (tous les deux requis). */
export function identifiantsInitiaux(
  env: Record<string, string | undefined> = process.env
): IdentifiantsInitiaux | null {
  const nomUtilisateur = env.ADMIN_USERNAME
  const motDePasse = env.ADMIN_PASSWORD
  if (!nomUtilisateur?.trim() || !motDePasse) return null
  return { nomUtilisateur, motDePasse }
}

/** Vrai si `motDePasse` est celui dont `hash` est l'empreinte. */
export function motDePasseCorrect(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash)
}

type Nouveaux = { nomUtilisateur: string; motDePasse?: string }

/**
 * Enregistre un nouvel identifiant et, si `motDePasse` est donné, un nouveau mot de passe.
 *
 * Un mot de passe qui change ferme les sessions de ce compte (celui qui l'a volé ou deviné
 * ne reste pas connecté), sauf celle de `jetonAConserver` : la personne qui vient de le
 * changer n'a pas à se reconnecter. Sans `jetonAConserver`, toutes les sessions sont fermées.
 * L'identifiant seul change sans fermer de session.
 */
export async function appliquerIdentifiants(
  client: Client,
  utilisateurId: string,
  nouveaux: Nouveaux,
  options: { jetonAConserver?: string } = {}
): Promise<void> {
  const motDePasseHash =
    nouveaux.motDePasse === undefined
      ? undefined
      : await bcrypt.hash(nouveaux.motDePasse, COUT_BCRYPT)

  await client.$transaction(async (tx) => {
    await tx.utilisateur.update({
      where: { id: utilisateurId },
      data: { nomUtilisateur: nouveaux.nomUtilisateur, motDePasseHash },
    })
    if (motDePasseHash !== undefined) {
      await tx.session.deleteMany({
        where: {
          utilisateurId,
          ...(options.jetonAConserver ? { token: { not: options.jetonAConserver } } : {}),
        },
      })
    }
  })
}

export type ResultatRetablissement = { nomUtilisateur: string; resultat: 'cree' | 'mis_a_jour' }

/**
 * Pour le script `admin:reset` : remet le compte administrateur aux identifiants initiaux
 * quand on ne peut plus se connecter. Le compte visé est celui qui porte déjà l'identifiant
 * initial ; à défaut, l'unique compte existant (identifiant modifié depuis) ; s'il n'y en a
 * aucun, il est créé. Avec plusieurs comptes dont aucun ne porte l'identifiant initial, rien
 * n'est modifié : on ne devine pas lequel est le bon.
 */
export async function retablirCompteAdministrateur(
  client: Client,
  initiaux: IdentifiantsInitiaux
): Promise<ResultatRetablissement> {
  const comptes = await client.utilisateur.findMany({ select: { id: true, nomUtilisateur: true } })
  const cible =
    comptes.find((c) => c.nomUtilisateur === initiaux.nomUtilisateur) ??
    (comptes.length === 1 ? comptes[0] : undefined)

  if (cible) {
    await appliquerIdentifiants(client, cible.id, initiaux)
    return { nomUtilisateur: initiaux.nomUtilisateur, resultat: 'mis_a_jour' }
  }
  if (comptes.length > 0) {
    throw new Error(
      `Plusieurs comptes existent et aucun ne porte l'identifiant initial « ${initiaux.nomUtilisateur} » : rien n'a été modifié.`
    )
  }
  await client.utilisateur.create({
    data: {
      nomUtilisateur: initiaux.nomUtilisateur,
      motDePasseHash: await bcrypt.hash(initiaux.motDePasse, COUT_BCRYPT),
    },
  })
  return { nomUtilisateur: initiaux.nomUtilisateur, resultat: 'cree' }
}
