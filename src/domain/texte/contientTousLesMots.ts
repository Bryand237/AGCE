import { motsNormalises, normaliserTexte } from './normaliserTexte'

/**
 * La règle de la recherche libre, la même partout (liste des enseignants, des absences, des
 * rapports d'avancement) : la saisie est découpée en mots, et CHAQUE mot doit se retrouver dans
 * l'un des textes. L'ordre des mots et le texte qui les contient n'ont pas d'importance :
 * « Alice Mbarga », « mbarga alice » et « mba ali » trouvent tous Alice MBARGA.
 *
 * La comparaison ignore casse, accents et ponctuation (voir normaliserTexte) : « eme » trouve
 * « 54ème », « Ndé » trouve « Nde ». Seule la comparaison est tolérante, jamais la valeur
 * enregistrée.
 *
 * Une saisie vide, ou sans autre caractère que de la ponctuation, ne restreint rien.
 */
export function contientTousLesMots(recherche: string, textes: readonly string[]): boolean {
  const mots = motsNormalises(recherche)
  if (mots.length === 0) return true
  const formes = textes.map(normaliserTexte)
  return mots.every((mot) => formes.some((forme) => forme.includes(mot)))
}

/** Cette saisie contient-elle au moins un mot à chercher ? Sinon, aucun filtre à appliquer. */
export function recherchePeutRestreindre(recherche: string): boolean {
  return motsNormalises(recherche).length > 0
}
