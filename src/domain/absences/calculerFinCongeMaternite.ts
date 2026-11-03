const DUREE_CONGE_MATERNITE_JOURS = 98 // 14 semaines — ajustez si la règle exacte diffère

/**
 * Reste toujours modifiable dans le formulaire : un écart d'environ une
 * semaine a été observé entre ce calcul et le document réel fourni en
 * exemple, sans confirmation possible de la convention exacte — mieux
 * vaut un défaut raisonnable et ajustable qu'un blocage sur une inconnue.
 */
export function calculerFinCongeMaternite(dateDebut: Date): Date {
  // En UTC, comme toutes les dates : avec setDate()/getDate() (heure locale), un changement
  // d'heure légale entre les deux dates ramenait le résultat à 23 h UTC, la veille (audit D8).
  const dateFin = new Date(dateDebut)
  dateFin.setUTCDate(dateFin.getUTCDate() + DUREE_CONGE_MATERNITE_JOURS)
  return dateFin
}