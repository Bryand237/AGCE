/**
 * L'apostrophe droite (') devient l'apostrophe typographique (’) : c'est celle des gabarits Word,
 * recopiés des décisions originales (« l’Université », « d’Histoire »). Sans cela, une phrase
 * mêle les deux (« Département d'Histoire de la Faculté … de l’Université »), car les noms
 * saisis dans l'application portent l'apostrophe du clavier.
 */
export function apostropheTypographique(texte: string): string {
  return texte.replace(/'/g, '’')
}

/** Applique `apostropheTypographique` aux valeurs texte ; les nombres restent des nombres. */
export function typographierValeurs<V extends string | number>(
  valeurs: Record<string, V>
): Record<string, V> {
  const resultat: Record<string, V> = {}
  for (const [cle, valeur] of Object.entries(valeurs)) {
    resultat[cle] = (typeof valeur === 'string' ? apostropheTypographique(valeur) : valeur) as V
  }
  return resultat
}
