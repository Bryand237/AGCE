import { redirect } from 'next/navigation'
import { recupererUtilisateurConnecte } from '@/lib/auth'
import { determinerDestinationInitiale } from '@/domain/auth/determinerDestinationInitiale'

export default async function PageAccueil() {
  const utilisateur = await recupererUtilisateurConnecte()
  redirect(determinerDestinationInitiale(utilisateur))
}
