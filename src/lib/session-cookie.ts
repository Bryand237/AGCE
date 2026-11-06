/**
 * Faut-il marquer le cookie de session « Secure » ?
 *
 * Un cookie « Secure » n'est renvoyé par le navigateur qu'en HTTPS (la seule exception est
 * `localhost`). Avant, l'attribut suivait NODE_ENV : en production, une application servie en
 * HTTP simple sur le réseau local (http://192.168.x.x:3000) acceptait la connexion, puis le
 * navigateur refusait le cookie et renvoyait sans cesse à la page de connexion, sans message.
 *
 * `SESSION_COOKIE_SECURE=true` ou `false` (dans `.env`) tranche. Absente, la variable laisse le
 * comportement d'origine : « Secure » en production, pas en développement. Ne mettre `false` que
 * si l'application n'est pas servie en HTTPS : c'est alors l'accès réseau qui doit être protégé
 * (voir le README, « Accès réseau »).
 */
export function cookieSessionSecurise(
  env: Record<string, string | undefined> = process.env
): boolean {
  const choix = env.SESSION_COOKIE_SECURE?.trim().toLowerCase()
  if (choix === 'true') return true
  if (choix === 'false') return false
  return env.NODE_ENV === 'production'
}
