import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { COUT_BCRYPT } from '@/lib/comptes/identifiants'

// Calculé une fois, à la première connexion d'un identifiant inconnu, puis gardé.
let hashFactice: Promise<string> | undefined

/**
 * Vrai si `motDePasse` correspond à `hash`. Sans `hash` (identifiant inconnu), le mot de passe
 * est quand même comparé, à un vrai hash bcrypt de même coût que les comptes réels, puis le
 * résultat est écarté : la réponse prend le même temps qu'un mauvais mot de passe sur un compte
 * existant, et ne révèle donc pas si l'identifiant existe.
 *
 * Il faut un hash VALIDE : bcryptjs répond « faux » sans calcul à toute chaîne qui n'a pas la
 * longueur d'un hash bcrypt (60 caractères), ce qui rendrait l'identifiant inconnu mesurable à
 * l'œil, une réponse en quelques millisecondes contre environ 250 ms.
 */
export async function verifierMotDePasse(
  motDePasse: string,
  hash: string | undefined
): Promise<boolean> {
  if (hash) return bcrypt.compare(motDePasse, hash)

  hashFactice ??= bcrypt.hash(randomBytes(16).toString('hex'), COUT_BCRYPT)
  await bcrypt.compare(motDePasse, await hashFactice)
  return false
}
