export function determinerDestinationInitiale(utilisateur: unknown | null) {
  return utilisateur ? '/dashboard' : '/connexion'
}
