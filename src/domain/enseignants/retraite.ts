import { ajouterAnnees } from '../dates/jourCivil'

const AGE_RETRAITE_PAR_GRADE: Record<string, number> = {
  ASSISTANT: 55,
  CHARGE_DE_COURS: 60,
  MAITRE_DE_CONFERENCES: 65,
  PROFESSEUR: 65,
}

export function calculerAgeRetraite(grade: string): number {
  const age = AGE_RETRAITE_PAR_GRADE[grade]
  if (age === undefined) {
    throw new Error(`Âge de retraite non défini pour le grade "${grade}"`)
  }
  return age
}

/**
 * Date de retraite prévue — TOUJOURS calculée, jamais stockée en base.
 *
 * Le grade d'un enseignant peut changer en cours de carrière (Chargé de
 * Cours → Maître de Conférences, par exemple), ce qui change son âge de
 * départ (60 → 65 ans). Une valeur enregistrée une fois pour toutes
 * deviendrait fausse en silence dès le premier changement de grade non
 * répercuté dessus — c'est pour ça qu'elle se calcule à la lecture,
 * jamais à l'écriture.
 */
export function calculerDateRetraitePrevue(dateNaissance: Date, grade: string): Date {
  // Calcul en UTC (voir jourCivil.ts) : les dates sont enregistrées à minuit UTC, et setFullYear
  // (heure locale) les décalait d'un jour quand le fuseau change d'heure légale entre la
  // naissance et la retraite.
  return ajouterAnnees(dateNaissance, calculerAgeRetraite(grade))
}

export function estEligibleRetraite(
  dateNaissance: Date,
  grade: string,
  aujourdhui: Date = new Date()
): boolean {
  return calculerDateRetraitePrevue(dateNaissance, grade) <= aujourdhui
}

/**
 * Pour une alerte tableau de bord ("bientôt à la retraite") sans dupliquer
 * la logique de seuil ailleurs. `seuilAnnees` = fenêtre d'anticipation.
 */
export function estProcheRetraite(
  dateNaissance: Date,
  grade: string,
  seuilAnnees = 2,
  aujourdhui: Date = new Date()
): boolean {
  const dateRetraite = calculerDateRetraitePrevue(dateNaissance, grade)
  const dansNAns = ajouterAnnees(aujourdhui, seuilAnnees)
  return dateRetraite > aujourdhui && dateRetraite <= dansNAns
}
