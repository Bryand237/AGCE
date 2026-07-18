const DUREE_CONGE_MATERNITE_JOURS = 98 // 14 semaines — ajustez si la règle exacte diffère

/**
 * Reste toujours modifiable dans le formulaire : un écart d'environ une
 * semaine a été observé entre ce calcul et le document réel fourni en
 * exemple, sans confirmation possible de la convention exacte — mieux
 * vaut un défaut raisonnable et ajustable qu'un blocage sur une inconnue.
 */
export function calculerFinCongeMaternite(dateDebut: Date): Date {
  const dateFin = new Date(dateDebut)
  dateFin.setDate(dateFin.getDate() + DUREE_CONGE_MATERNITE_JOURS)
  return dateFin
}