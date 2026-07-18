export type PalierIndiciaire = {
  id: string
  grade: string
  voie: string | null
  sousCategorie: string | null
  classe: number | null
  echelon: number | null
  indice: number
  ordre: number
}

/**
 * Calcule le palier suivant dans la grille indiciaire d'un grade donné.
 *
 * Fonction pure : aucune dépendance à Prisma ni à React. Testable
 * unitairement sans base de données ni navigateur — c'est la règle pour
 * tout ce qui vit dans src/domain.
 *
 * Important : filtre par (grade, voie), pas seulement par grade. `voie`
 * distingue des embranchements parallèles et exclusifs (Assistant
 * "sans thèse" vs "avec thèse") — sans ce filtre, un Assistant "sans
 * thèse" arrivé à son dernier échelon se verrait proposer le premier
 * échelon "avec thèse" au lieu d'une fin de grade. `sousCategorie`
 * (Délégué, Stagiaire, Classe Exceptionnelle...) n'est qu'un libellé et
 * n'intervient jamais dans ce filtre : ces paliers appartiennent tous à
 * la même séquence continue.
 *
 * Retourne null si l'enseignant est déjà au dernier palier de sa
 * voie/grade (ex : "Hors Échelle" pour un Professeur). Dans ce cas,
 * seul un changement de CLASSE ou de GRADE (pas d'échelon) pourrait
 * s'appliquer — un processus différent, non couvert par cette fonction.
 */
export function calculerProchainEchelon(
  grille: PalierIndiciaire[],
  grade: string,
  ordreActuel: number
): PalierIndiciaire | null {
  const ligneActuelle = grille.find((p) => p.grade === grade && p.ordre === ordreActuel)
  if (!ligneActuelle) {
    return null
  }

  const echelle = grille
    .filter((p) => p.grade === grade && p.voie === ligneActuelle.voie)
    .sort((a, b) => a.ordre - b.ordre)

  const indexActuel = echelle.findIndex((p) => p.ordre === ordreActuel)
  if (indexActuel === -1 || indexActuel === echelle.length - 1) {
    return null
  }
  return echelle[indexActuel + 1]!
}
