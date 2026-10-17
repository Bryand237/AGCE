import { LIBELLES_GRADE } from '@/domain/enseignants/grade'

/**
 * Ce qu'il faut savoir d'une ligne de la grille pour comparer deux positions. Les lignes
 * Prisma (EchelonIndiciaire) conviennent telles quelles. Comme calculerProchainEchelon, ce
 * module ne dépend ni de Prisma ni de React : il se teste sans base de données.
 */
export type PositionComparable = {
  grade: string
  voie: string | null
  ordre: number
}

/**
 * Règle d'un avancement d'échelon : la position proposée reste dans le MÊME grade et la MÊME
 * voie que la position de départ, et lui est strictement SUPÉRIEURE. Plusieurs paliers peuvent
 * être franchis d'un coup (c'est le rôle du formulaire « Modifier la position proposée »).
 *
 * Un changement de grade ou de voie (Assistant sans thèse → avec thèse) est un autre processus :
 * calculerProchainEchelon renvoie null en fin de grille pour la même raison. Il ne passe donc
 * pas par ce contrôle, sans quoi Enseignant.grade et positionActuelle.grade divergeraient (les
 * âges de retraite, les tris et les statistiques se calculent sur `grade`).
 *
 * Renvoie le message à afficher, ou `undefined` si la position convient.
 */
export function erreurPositionProposee(
  depart: PositionComparable,
  proposee: PositionComparable
): string | undefined {
  if (proposee.grade !== depart.grade) {
    const grade = LIBELLES_GRADE[depart.grade] ?? depart.grade
    return `La position proposée doit rester dans le grade de l'enseignant (${grade}) : un changement de grade ne passe pas par un avancement d'échelon.`
  }
  if (proposee.voie !== depart.voie) {
    return "La position proposée doit rester dans la même voie que la position de départ : un changement de voie ne passe pas par un avancement d'échelon."
  }
  if (proposee.ordre <= depart.ordre) {
    return "La position proposée doit être supérieure à la position de départ de l'enseignant."
  }
  return undefined
}

/**
 * Les positions que la règle ci-dessus autorise, dans l'ordre de la grille. Sert à remplir la
 * liste déroulante : on n'y propose que des choix que le serveur acceptera.
 */
export function positionsProposables<T extends PositionComparable>(
  grille: T[],
  depart: PositionComparable
): T[] {
  return grille
    .filter((position) => erreurPositionProposee(depart, position) === undefined)
    .sort((a, b) => a.ordre - b.ordre)
}
