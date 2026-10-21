import { calculerProchainEchelon } from '../avancement/calculerProchainEchelon'
import type { PalierIndiciaire } from '../avancement/calculerProchainEchelon'
import { dateEligibiliteAvancement } from '../avancement/eligibilite'
import { calculerDateRetraitePrevue } from './retraite'

/** Ce qu'il faut savoir d'un enseignant pour dire où il en est dans sa carrière. */
export type EntreeSituation = {
  statut: string // ACTIF | TRANSFERE | RETRAITE
  grade: string
  dateNaissance: Date
  dateFinService: Date | null
  dateEffetEchelon: Date
  /** `ordre` de sa position actuelle dans la grille indiciaire. */
  ordrePosition: number
}

export type SituationEnseignant = {
  /**
   * Date de départ à la retraite :
   * - retraité : la date réellement enregistrée (dateFinService), à défaut la date théorique ;
   * - actif : la date théorique (naissance + âge de retraite du grade) ;
   * - transféré : aucune (il ne part plus à la retraite de l'université).
   */
  dateRetraite: Date | null
  /** Vrai quand `dateRetraite` est la date réellement enregistrée et non un calcul. */
  retraiteEnregistree: boolean
  /**
   * Date à laquelle un actif devient éligible à l'échelon suivant. Aucune pour un actif au
   * dernier palier de son grade, ni pour un retraité ou un transféré.
   */
  dateProchainAvancement: Date | null
  /** Actif arrivé au dernier palier de sa grille : plus d'avancement d'échelon possible. */
  finDeGrade: boolean
}

/**
 * Situation de carrière d'un enseignant. Fonction pure : tout est calculé à la lecture, jamais
 * enregistré (un grade ou une date corrigés rendraient une valeur stockée fausse sans alerte).
 * Les mêmes règles servent l'écran, les PDF et les exports.
 */
export function calculerSituation(
  enseignant: EntreeSituation,
  grille: PalierIndiciaire[]
): SituationEnseignant {
  if (enseignant.statut === 'TRANSFERE') {
    return {
      dateRetraite: null,
      retraiteEnregistree: false,
      dateProchainAvancement: null,
      finDeGrade: false,
    }
  }

  const dateTheorique = calculerDateRetraitePrevue(enseignant.dateNaissance, enseignant.grade)

  if (enseignant.statut === 'RETRAITE') {
    return {
      dateRetraite: enseignant.dateFinService ?? dateTheorique,
      retraiteEnregistree: enseignant.dateFinService !== null,
      dateProchainAvancement: null,
      finDeGrade: false,
    }
  }

  const suivant = calculerProchainEchelon(grille, enseignant.grade, enseignant.ordrePosition)
  return {
    dateRetraite: dateTheorique,
    retraiteEnregistree: false,
    dateProchainAvancement: suivant ? dateEligibiliteAvancement(enseignant.dateEffetEchelon) : null,
    finDeGrade: suivant === null,
  }
}
