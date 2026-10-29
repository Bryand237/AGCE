// Remet le compte administrateur aux identifiants du fichier .env (ADMIN_USERNAME,
// ADMIN_PASSWORD) : à lancer quand on ne peut plus se connecter (`npm run admin:reset`).
// Ne touche à aucune autre donnée. Voir README, « Identifiants oubliés ».
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { identifiantsInitiaux, retablirCompteAdministrateur } from '../src/lib/comptes/identifiants'

async function main() {
  const initiaux = identifiantsInitiaux()
  if (!initiaux) {
    throw new Error(
      'ADMIN_USERNAME et ADMIN_PASSWORD doivent être définis dans le fichier .env : rien n’a été modifié.'
    )
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })
  try {
    const { nomUtilisateur, resultat } = await retablirCompteAdministrateur(prisma, initiaux)
    console.log(
      resultat === 'cree'
        ? `Compte « ${nomUtilisateur} » créé avec le mot de passe de .env (ADMIN_PASSWORD).`
        : `Compte rétabli : identifiant « ${nomUtilisateur} », mot de passe de .env (ADMIN_PASSWORD).`
    )
    console.log('Toutes les sessions ouvertes ont été fermées : reconnectez-vous.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((erreur) => {
  console.error(`Échec : ${erreur instanceof Error ? erreur.message : erreur}`)
  process.exit(1)
})
