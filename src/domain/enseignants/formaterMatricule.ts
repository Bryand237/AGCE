/**
 * Matricule tel qu'il s'écrit dans les listes officielles : sept chiffres et une lettre, avec
 * une espace après le quatrième chiffre (« 0652125K » → « 0652 125K »). Un matricule d'une
 * autre forme est renvoyé tel quel (espaces de bord retirées) : on n'invente rien.
 */
export function formaterMatricule(matricule: string): string {
  const compact = matricule.replace(/\s+/g, '')
  const m = /^(\d{4})(\d{3}[A-Za-z])$/.exec(compact)
  return m ? `${m[1]} ${m[2]}` : matricule.trim()
}
