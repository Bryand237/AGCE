import { formaterDateIso } from '../../dates/jourCivil'
import { ORDRE_PAR_DEFAUT, TRI_PAR_DEFAUT } from './filtres'
import type { CritereAbsence, CritereDate, CritereEcheance, FiltresEnseignants } from './filtres'

function ajouterCritereDate(sortie: URLSearchParams, prefixe: string, critere: CritereDate): void {
  if (critere.annee !== undefined) sortie.set(`${prefixe}Annee`, String(critere.annee))
  if (critere.du) sortie.set(`${prefixe}Du`, formaterDateIso(critere.du))
  if (critere.au) sortie.set(`${prefixe}Au`, formaterDateIso(critere.au))
}

function ajouterCritereEcheance(
  sortie: URLSearchParams,
  prefixe: string,
  critere: CritereEcheance
): void {
  if (critere.echeance) sortie.set(`${prefixe}Echeance`, critere.echeance)
  ajouterCritereDate(sortie, prefixe, critere)
}

const ouiNon = (valeur: boolean) => (valeur ? 'oui' : 'non')

function ajouterCritereAbsence(sortie: URLSearchParams, critere: CritereAbsence): void {
  if (critere.presence !== undefined) sortie.set('absence', ouiNon(critere.presence))
  for (const etat of critere.etats) sortie.append('absenceEtat', etat)
  for (const type of critere.types) sortie.append('absenceType', type)
  ajouterCritereDate(sortie, 'absenceDebut', critere.debut)
  ajouterCritereDate(sortie, 'absenceFin', critere.fin)
  ajouterCritereDate(sortie, 'absencePendant', critere.pendant)
}

/**
 * Paramètres d'adresse qui décrivent exactement ces filtres : seulement ce qui diffère de
 * « aucun filtre », dans un ordre fixe. Deux filtres identiques donnent la même adresse, et
 * lireFiltres() relit ce que cette fonction écrit. C'est la seule façon de fabriquer un lien
 * (tri, page suivante, retrait d'un filtre) : aucun lien n'est assemblé à la main.
 */
export function versParametres(filtres: FiltresEnseignants): URLSearchParams {
  const sortie = new URLSearchParams()

  if (filtres.recherche !== '') sortie.set('recherche', filtres.recherche)
  for (const statut of filtres.statuts) sortie.append('statut', statut)
  for (const grade of filtres.grades) sortie.append('grade', grade)
  if (filtres.sexe) sortie.set('sexe', filtres.sexe)
  if (filtres.etablissementId) sortie.set('etablissement', filtres.etablissementId)
  if (filtres.departementId) sortie.set('departement', filtres.departementId)
  if (filtres.regionId) sortie.set('region', filtres.regionId)
  if (filtres.departementOrigineId) sortie.set('origine', filtres.departementOrigineId)
  if (filtres.resident !== undefined) sortie.set('resident', ouiNon(filtres.resident))
  if (filtres.collaboration !== undefined) {
    sortie.set('collaboration', ouiNon(filtres.collaboration))
  }
  if (filtres.responsabilite !== undefined) {
    sortie.set('responsabilite', ouiNon(filtres.responsabilite))
  }
  if (filtres.classe !== undefined) sortie.set('classe', String(filtres.classe))
  if (filtres.echelon !== undefined) sortie.set('echelon', String(filtres.echelon))
  if (filtres.indiceMin !== undefined) sortie.set('indiceMin', String(filtres.indiceMin))
  if (filtres.indiceMax !== undefined) sortie.set('indiceMax', String(filtres.indiceMax))
  ajouterCritereDate(sortie, 'naissance', filtres.naissance)
  ajouterCritereDate(sortie, 'priseService', filtres.priseService)
  ajouterCritereEcheance(sortie, 'retraite', filtres.retraite)
  ajouterCritereEcheance(sortie, 'avancement', filtres.avancement)
  ajouterCritereAbsence(sortie, filtres.absence)

  if (filtres.tri !== TRI_PAR_DEFAUT) sortie.set('trier', filtres.tri)
  if (filtres.ordre !== ORDRE_PAR_DEFAUT) sortie.set('ordre', filtres.ordre)
  if (filtres.page > 1) sortie.set('page', String(filtres.page))
  return sortie
}

/** Adresse de la liste des enseignants pour ces filtres. */
export function adresseListe(filtres: FiltresEnseignants, chemin = '/enseignants'): string {
  const parametres = versParametres(filtres).toString()
  return parametres === '' ? chemin : `${chemin}?${parametres}`
}

/**
 * Valeurs à mettre dans les champs du formulaire de filtres, nom de paramètre par nom de
 * paramètre (une liste, pour les cases à cocher). Sans le tri ni la page : ce ne sont pas des
 * filtres, le formulaire les gère à part.
 */
export function valeursDeFormulaire(filtres: FiltresEnseignants): Record<string, string[]> {
  const valeurs: Record<string, string[]> = {}
  for (const [cle, valeur] of versParametres({ ...filtres, page: 1 }).entries()) {
    ;(valeurs[cle] ??= []).push(valeur)
  }
  return valeurs
}
