import { debutDeJour } from '../dates/jourCivil'
import type { AbsenceDossier, TypeAbsence } from '../enseignants/dossier'

/**
 * Où en est une absence AUJOURD'HUI, calculé à partir de ses dates et jamais lu dans le champ
 * `statut` de la base : ce champ ne suit pas le temps (une absence validée reste « en période »
 * même terminée depuis des semaines, tant que personne n'ouvre la page des absences pour la
 * faire basculer). Les dates, elles, sont toujours justes.
 *
 * - terminée : l'enseignant est revenu (date de retour enregistrée) ;
 * - à venir : le début est après aujourd'hui ;
 * - dépassée : la fin prévue est passée sans retour enregistré (il faut régulariser) ;
 * - en cours : tous les autres cas (début atteint, fin pas encore dépassée).
 *
 * Une absence en attente de validation compte comme les autres : la validation est une
 * formalité administrative, elle ne change pas le fait que l'enseignant soit absent.
 */
export const ETATS_ABSENCE = ['en-cours', 'a-venir', 'depassee', 'terminee'] as const
export type EtatAbsence = (typeof ETATS_ABSENCE)[number]

export const LIBELLES_ETAT_ABSENCE: Record<EtatAbsence, string> = {
  'en-cours': 'En cours',
  'a-venir': 'À venir',
  depassee: 'Dépassée (retour non enregistré)',
  terminee: 'Terminée',
}

export const LIBELLES_TYPE_ABSENCE: Record<TypeAbsence, string> = {
  MISSION: 'Mission',
  CONGE_MATERNITE: 'Congé de maternité',
  CONGE_MALADIE: 'Congé de maladie',
  CONGE_ADMINISTRATIF: 'Congé administratif',
  AUTRE: 'Autre',
}

export type AbsenceEvaluee = Pick<AbsenceDossier, 'statut' | 'dateDebut' | 'dateFin' | 'dateRetour'>

export function etatAbsence(absence: AbsenceEvaluee, jour: Date): EtatAbsence {
  if (absence.statut === 'TERMINE' || absence.dateRetour !== null) return 'terminee'
  const aujourdhui = debutDeJour(jour).getTime()
  if (debutDeJour(absence.dateDebut).getTime() > aujourdhui) return 'a-venir'
  if (debutDeJour(absence.dateFin).getTime() < aujourdhui) return 'depassee'
  return 'en-cours'
}

/**
 * L'absence qui occupe l'enseignant aujourd'hui : celle en cours, à défaut celle dont le retour
 * n'est pas enregistré. Rien s'il n'est pas absent.
 */
export function absenceActuelle(
  absences: readonly AbsenceDossier[],
  jour: Date
): { absence: AbsenceDossier; etat: 'en-cours' | 'depassee' } | undefined {
  const evaluees = absences.map((absence) => ({ absence, etat: etatAbsence(absence, jour) }))
  const enCours = evaluees.find((e) => e.etat === 'en-cours')
  if (enCours) return { absence: enCours.absence, etat: 'en-cours' }
  const depassee = evaluees.find((e) => e.etat === 'depassee')
  return depassee ? { absence: depassee.absence, etat: 'depassee' } : undefined
}
