/**
 * Forme de comparaison d'un texte : minuscules, sans accents ni cédilles, ponctuation
 * (apostrophes, tirets, points…) remplacée par une espace, espaces compactées.
 *
 * Sert à la recherche (« Ndé » trouve « Nde », « d'Histoire » trouve « d Histoire ») et à
 * l'association d'un nom de région à son abréviation. La base de données n'est pas touchée :
 * seule la comparaison est tolérante, jamais la valeur enregistrée.
 */
export function normaliserTexte(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // accents, cédilles, trémas : séparés par NFD, puis retirés
    .toLowerCase()
    .replace(/œ/g, 'oe') // NFD ne décompose pas les ligatures
    .replace(/æ/g, 'ae')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Mots d'une saisie, dans leur forme de comparaison. Une saisie vide donne une liste vide. */
export function motsNormalises(texte: string): string[] {
  const normalise = normaliserTexte(texte)
  return normalise === '' ? [] : normalise.split(' ')
}
