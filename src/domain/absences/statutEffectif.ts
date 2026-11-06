import { debutDeJour } from '../dates/jourCivil'
import type { StatutAbsence } from '../enseignants/dossier'

/**
 * Le statut d'une absence AUJOURD'HUI, dans le déroulement de son dossier : en attente de
 * validation, en période, dépassée (la fin prévue est passée sans retour enregistré), terminée.
 *
 * Le champ `statut` de la base ne suit pas le temps : une absence validée y reste « en période »
 * jusqu'à son retour, même si sa fin est passée depuis des semaines. Le faire basculer demandait
 * une écriture à chaque affichage de la liste des absences (et rien ne la déclenchait ailleurs :
 * la fiche et les compteurs restaient en retard tant que la liste n'avait pas été ouverte). Le
 * statut « dépassée » se déduit donc de la date de fin, à chaque lecture, et n'est plus écrit.
 *
 * - en attente et terminée ne dépendent pas de la date : renvoyées telles quelles ;
 * - validée (« en période » ou « dépassée » dans la base) : dépassée quand le DERNIER JOUR est
 *   passé, en période jusque-là, dernier jour compris. Une ancienne valeur « dépassée » enregistrée
 *   par l'ancien mécanisme est donc relue d'après les dates : si la fin a été repoussée depuis,
 *   l'absence redevient « en période ».
 *
 * `etatAbsence` (etatAbsence.ts) répond à une autre question, « l'enseignant est-il absent
 * aujourd'hui ? », d'après les seules dates ; ici on suit le dossier (validation comprise).
 *
 * @param jour le jour de référence, tel que le lit l'utilisateur : `aujourdhui()` (jourCivil.ts).
 */
export function statutEffectif(
  absence: { statut: StatutAbsence; dateFin: Date },
  jour: Date
): StatutAbsence {
  if (absence.statut !== 'EN_PERIODE' && absence.statut !== 'DEPASSE') return absence.statut
  return debutDeJour(absence.dateFin).getTime() < debutDeJour(jour).getTime()
    ? 'DEPASSE'
    : 'EN_PERIODE'
}

/** Les statuts d'une absence, tels qu'ils s'écrivent à l'écran. */
export const LIBELLES_STATUT_ABSENCE: Record<StatutAbsence, string> = {
  EN_ATTENTE: 'En attente',
  EN_PERIODE: 'En période',
  DEPASSE: 'Dépassé',
  TERMINE: 'Terminé',
}

/** Ordre du tri par statut : ce qui attend une action d'abord, le terminé en dernier. */
export const RANG_STATUT: Record<StatutAbsence, number> = {
  EN_ATTENTE: 0,
  EN_PERIODE: 1,
  DEPASSE: 2,
  TERMINE: 3,
}
