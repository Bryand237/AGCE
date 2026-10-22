import { ORDRE_GRADE } from '../grade'
import { STATUTS_ENSEIGNANT } from '../dossier'
import type { DossierEnseignant } from '../dossier'
import type { SituationEnseignant } from '../situation'
import type { CleTri, Ordre } from './filtres'

/** Un dossier et sa situation de carrière, calculée une fois pour toute la recherche. */
export type LigneRecherche = { dossier: DossierEnseignant; situation: SituationEnseignant }

const collateur = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/** Dates absentes à la fin, quel que soit le sens du tri. */
function comparerDates(a: Date | null, b: Date | null, sens: number): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1
  return sens * (a.getTime() - b.getTime())
}

function comparerCle(tri: CleTri, a: LigneRecherche, b: LigneRecherche, sens: number): number {
  switch (tri) {
    case 'grade':
      return sens * (ORDRE_GRADE.indexOf(a.dossier.grade) - ORDRE_GRADE.indexOf(b.dossier.grade))
    case 'statut':
      return (
        sens *
        (STATUTS_ENSEIGNANT.indexOf(a.dossier.statut) -
          STATUTS_ENSEIGNANT.indexOf(b.dossier.statut))
      )
    case 'etablissement':
      return (
        sens *
        collateur.compare(a.dossier.etablissement.abreviation, b.dossier.etablissement.abreviation)
      )
    case 'retraite':
      return comparerDates(a.situation.dateRetraite, b.situation.dateRetraite, sens)
    case 'priseService':
      return comparerDates(a.dossier.datePriseService, b.dossier.datePriseService, sens)
    case 'naissance':
      return comparerDates(a.dossier.dateNaissance, b.dossier.dateNaissance, sens)
    case 'nom':
      return sens * collateur.compare(a.dossier.nom, b.dossier.nom)
  }
}

/**
 * Trie sans modifier la liste reçue. Le sens (croissant ou décroissant) ne joue que sur la
 * clé choisie ; à égalité, l'ordre est toujours nom, prénom, identifiant : deux affichages
 * successifs de la même liste donnent le même ordre, et une page ne répète jamais une ligne de
 * la précédente.
 */
export function trierLignes(
  lignes: readonly LigneRecherche[],
  tri: CleTri,
  ordre: Ordre
): LigneRecherche[] {
  const sens = ordre === 'asc' ? 1 : -1
  return [...lignes].sort((a, b) => {
    const parCle = comparerCle(tri, a, b, sens)
    if (parCle !== 0) return parCle
    return (
      collateur.compare(a.dossier.nom, b.dossier.nom) ||
      collateur.compare(a.dossier.prenom, b.dossier.prenom) ||
      (a.dossier.id < b.dossier.id ? -1 : a.dossier.id > b.dossier.id ? 1 : 0)
    )
  })
}
