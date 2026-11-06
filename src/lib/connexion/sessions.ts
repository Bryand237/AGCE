import type { PrismaClient } from '@/generated/prisma/client'

type Client = Pick<PrismaClient, 'session'>

/**
 * Supprime les sessions dont la date est dépassée. Une session expirée n'ouvre déjà plus rien
 * (voir `recupererUtilisateurConnecte`) ; elle ne ferait que grossir la table. Appelée à chaque
 * connexion réussie : aucune tâche planifiée à installer.
 *
 * Un échec ici ne doit pas empêcher de se connecter : il est consigné et la connexion continue.
 * Renvoie le nombre de sessions supprimées.
 */
export async function purgerSessionsExpirees(
  client: Client,
  maintenant: Date = new Date()
): Promise<number> {
  try {
    const { count } = await client.session.deleteMany({ where: { expiresAt: { lt: maintenant } } })
    return count
  } catch (erreur) {
    console.error('Purge des sessions expirées impossible :', erreur)
    return 0
  }
}
