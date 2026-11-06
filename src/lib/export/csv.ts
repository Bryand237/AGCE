/**
 * Fabrication d'un fichier CSV lisible tel quel par Excel en français : UTF-8 avec marque
 * d'ordre des octets (sinon les accents s'affichent de travers), séparateur « ; » (celui qu'Excel
 * attend avec les réglages régionaux français, la virgule servant de séparateur décimal) et fins
 * de ligne Windows.
 */

export const SEPARATEUR_CSV = ';'
const MARQUE_UTF8 = '﻿'

/**
 * Un tableur interprète comme une FORMULE toute cellule qui commence par « = », « @ » ou « + / - »
 * suivi de texte : un nom de domaine de recherche saisi « =HYPERLINK(...) » s'exécuterait à
 * l'ouverture du fichier. On neutralise ces valeurs en les faisant précéder d'une apostrophe.
 * Les numéros de téléphone « +237 6 89 … » et les nombres négatifs, qui ne contiennent que des
 * chiffres et des signes de ponctuation, restent intacts.
 */
export function neutraliserFormule(valeur: string): string {
  if (/^[=@\t\r]/.test(valeur)) return `'${valeur}`
  if (/^[+-]/.test(valeur) && !/^[+-][\d\s().-]*$/.test(valeur)) return `'${valeur}`
  return valeur
}

/** Une cellule : neutralisée, puis entre guillemets si elle contient un séparateur, un guillemet ou un saut de ligne. */
export function celluleCsv(valeur: string): string {
  const texte = neutraliserFormule(valeur)
  return /[";\r\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte
}

export function construireCsv(
  entetes: readonly string[],
  lignes: readonly (readonly string[])[]
): string {
  const ecrire = (cellules: readonly string[]) => cellules.map(celluleCsv).join(SEPARATEUR_CSV)
  return MARQUE_UTF8 + [ecrire(entetes), ...lignes.map(ecrire)].join('\r\n') + '\r\n'
}
