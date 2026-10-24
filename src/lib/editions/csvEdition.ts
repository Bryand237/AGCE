import type { DemandeEdition } from '@/domain/editions/editions'
import { regrouperParEtablissement } from '@/domain/editions/parEtablissement'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'
import { construireCsv } from '@/lib/export/csv'
import { colonnesEdition } from './colonnes'

/**
 * La même liste pour le tableur : toute l'université dans un seul fichier, d'où la colonne
 * « Établissement » en tête (on peut filtrer dessus), puis les colonnes de la liste imprimée,
 * avec les noms complets à la place des sigles. Mêmes lignes, même ordre que le PDF.
 */
export function construireCsvEdition(
  demande: DemandeEdition,
  lignes: readonly LigneRecherche[]
): string {
  const colonnes = colonnesEdition(demande)
  const entetes = ['Établissement', ...colonnes.map((colonne) => colonne.entete)]
  const donnees = regrouperParEtablissement(lignes).flatMap((etablissement) =>
    etablissement.lignes.map((ligne) => [
      etablissement.nom,
      ...colonnes.map((colonne) => (colonne.valeurCsv ?? colonne.valeur)(ligne)),
    ])
  )
  return construireCsv(entetes, donnees)
}
