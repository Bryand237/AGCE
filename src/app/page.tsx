import { redirect } from 'next/navigation'
import { recupererUtilisateurConnecte, determinerDestinationInitiale } from '@/lib/auth'

export default async function PageAccueil() {
  const utilisateur = await recupererUtilisateurConnecte()
  redirect(determinerDestinationInitiale(utilisateur))
}
