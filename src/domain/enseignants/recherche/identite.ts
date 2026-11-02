import { contientTousLesMots } from '../../texte/contientTousLesMots'
import { normaliserTexte } from '../../texte/normaliserTexte'

/** Ce qui identifie un enseignant dans une recherche libre. */
export type IdentiteEnseignant = { nom: string; prenom: string; matricule: string }

/**
 * Les textes dans lesquels la recherche cherche un enseignant : nom, prénom, matricule, et le
 * matricule sans espace (« 0652125K » doit trouver « 0652 125K »).
 */
export function textesDIdentite(enseignant: IdentiteEnseignant): string[] {
  return [
    enseignant.nom,
    enseignant.prenom,
    enseignant.matricule,
    normaliserTexte(enseignant.matricule).replace(/ /g, ''),
  ]
}

/**
 * Cet enseignant répond-il à la recherche libre ? Chaque mot doit se retrouver dans son nom, son
 * prénom ou son matricule : voir `contientTousLesMots`. Sert à la liste des absences ; la liste
 * des enseignants, qui cherche aussi dans le domaine et le lieu de naissance, part des mêmes textes.
 */
export function identiteCorrespond(enseignant: IdentiteEnseignant, recherche: string): boolean {
  return contientTousLesMots(recherche, textesDIdentite(enseignant))
}
