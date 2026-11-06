import type { StatutEnseignant } from './dossier'

/**
 * Règles de changement de statut d'un enseignant.
 *
 * Un enseignant en activité peut être marqué transféré ou retraité ; un enseignant transféré ou
 * retraité ne revient en activité que par une réactivation. Il ne passe jamais directement de
 * « retraité » à « transféré » (ni l'inverse) : ce serait cacher qu'une des deux saisies était
 * une erreur, et la date de fin de service de la première serait écrasée sans que personne
 * l'ait décidé.
 */
export type ChangementStatut = 'transferer' | 'retraiter' | 'reactiver'

const STATUT_VISE: Record<Exclude<ChangementStatut, 'reactiver'>, StatutEnseignant> = {
  transferer: 'TRANSFERE',
  retraiter: 'RETRAITE',
}

const ADJECTIF: Record<StatutEnseignant, string> = {
  ACTIF: 'actif',
  TRANSFERE: 'transféré',
  RETRAITE: 'retraité',
}

/**
 * Renvoie le message à afficher quand le changement est refusé pour ce statut actuel, ou
 * `undefined` quand il est permis.
 */
export function erreurChangementStatut(
  statutActuel: StatutEnseignant,
  changement: ChangementStatut
): string | undefined {
  if (changement === 'reactiver') {
    return statutActuel === 'ACTIF' ? 'Cet enseignant est déjà actif.' : undefined
  }

  if (statutActuel === 'ACTIF') return undefined

  const vise = STATUT_VISE[changement]
  if (statutActuel === vise) return `Cet enseignant est déjà ${ADJECTIF[vise]}.`
  return (
    `Cet enseignant est ${ADJECTIF[statutActuel]} : il ne peut pas être marqué ` +
    `${ADJECTIF[vise]}. Réactivez-le d'abord si son statut est une erreur.`
  )
}

/** Ce que la fiche affiche à la place de la date de fin de carrière, selon le statut. */
export type DateDeFin = { libelle: string; date: Date | null }

/**
 * La ligne de fin de carrière de la fiche : la retraite prévue (calculée) n'a de sens que pour
 * un enseignant en activité. Pour un retraité ou un transféré, c'est la date de fin de service
 * enregistrée, avec son vrai nom ; `null` quand le dossier ne la porte pas.
 */
export function dateDeFinAffichee(
  statut: StatutEnseignant,
  retraitePrevue: Date,
  dateFinService: Date | null
): DateDeFin {
  switch (statut) {
    case 'ACTIF':
      return { libelle: 'Retraite prévue', date: retraitePrevue }
    case 'RETRAITE':
      return { libelle: 'Date de retraite', date: dateFinService }
    case 'TRANSFERE':
      return { libelle: 'Date de transfert', date: dateFinService }
  }
}
