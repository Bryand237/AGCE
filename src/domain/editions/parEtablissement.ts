import type { LigneRecherche } from '../enseignants/recherche/trier'

export type GroupeEtablissement = {
  id: string
  nom: string
  lignes: LigneRecherche[]
}

const collateur = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/**
 * Une liste est classée par établissement : un groupe par établissement qui a au moins un
 * enseignant, rangés par ordre alphabétique de nom. À l'intérieur d'un groupe, l'ordre reçu est
 * conservé tel quel (c'est celui de la sélection : on ne le recalcule pas).
 */
export function regrouperParEtablissement(
  lignes: readonly LigneRecherche[]
): GroupeEtablissement[] {
  const groupes = new Map<string, GroupeEtablissement>()
  for (const ligne of lignes) {
    const { id, nom } = ligne.dossier.etablissement
    const groupe = groupes.get(id) ?? { id, nom, lignes: [] }
    groupe.lignes.push(ligne)
    groupes.set(id, groupe)
  }
  return [...groupes.values()].sort(
    (a, b) => collateur.compare(a.nom, b.nom) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  )
}
