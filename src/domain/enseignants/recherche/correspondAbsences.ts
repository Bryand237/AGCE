import { etatAbsence } from '../../absences/etatAbsence'
import { plageDe, critereAbsenceVide } from './filtres'
import type { CritereAbsence } from './filtres'
import { dansPlage, periodeRecoupePlage, plageEstVide } from '../../dates/plage'
import type { AbsenceDossier, DossierEnseignant } from '../dossier'

/** Cette absence répond-elle à TOUS les critères d'absence (état, type, début, fin, période) ? */
export function absenceRepondAuCritere(
  absence: AbsenceDossier,
  critere: CritereAbsence,
  jour: Date
): boolean {
  if (critere.etats.length > 0 && !critere.etats.includes(etatAbsence(absence, jour))) return false
  if (critere.types.length > 0 && !critere.types.includes(absence.type)) return false
  if (!dansPlage(absence.dateDebut, plageDe(critere.debut))) return false
  if (!dansPlage(absence.dateFin, plageDe(critere.fin))) return false

  const pendant = plageDe(critere.pendant)
  if (!plageEstVide(pendant)) {
    // Le retour réel, quand il est enregistré, remplace la fin prévue : un enseignant revenu
    // plus tôt n'était plus absent après son retour.
    const finEffective = absence.dateRetour ?? absence.dateFin
    if (!periodeRecoupePlage(absence.dateDebut, finEffective, pendant)) return false
  }
  return true
}

/**
 * Les absences d'un enseignant satisfont-elles le critère ? Un critère non renseigné ne
 * restreint rien. Sinon : « avec » (par défaut) = au moins une absence répond à tout ;
 * « sans » = aucune n'y répond.
 */
export function correspondAuxAbsences(
  dossier: DossierEnseignant,
  critere: CritereAbsence,
  jour: Date
): boolean {
  if (critereAbsenceVide(critere)) return true
  const existe = dossier.absences.some((absence) => absenceRepondAuCritere(absence, critere, jour))
  return critere.presence === false ? !existe : existe
}
