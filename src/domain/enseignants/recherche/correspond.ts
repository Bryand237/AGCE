import { debutDeJour } from '../../dates/jourCivil'
import { dansPlage } from '../../dates/plage'
import { contientTousLesMots } from '../../texte/contientTousLesMots'
import type { DossierEnseignant } from '../dossier'
import { critereEcheanceVide, plageDe } from './filtres'
import type { CritereEcheance, FiltresEnseignants } from './filtres'
import { correspondAuxAbsences } from './correspondAbsences'
import { textesDIdentite } from './identite'
import type { LigneRecherche } from './trier'

/**
 * La recherche libre de la liste des enseignants : l'identité (nom, prénom, matricule avec ou
 * sans espace), le domaine de recherche et le lieu de naissance. Chaque mot de la saisie doit se
 * retrouver quelque part : « Alice Mbarga » trouve Alice MBARGA. Même règle que la liste des
 * absences, voir `contientTousLesMots`.
 */
function correspondALaRecherche(dossier: DossierEnseignant, recherche: string): boolean {
  return contientTousLesMots(recherche, [
    ...textesDIdentite(dossier),
    dossier.domaineRecherche ?? '',
    dossier.lieuNaissance,
  ])
}

/**
 * Ce dossier satisfait-il tous les filtres ? Un critère non renseigné ne restreint rien.
 * Fonction pure : le même jugement sert l'écran, les PDF et les exports.
 */
export function correspondAuxFiltres(
  dossier: DossierEnseignant,
  filtres: FiltresEnseignants
): boolean {
  if (filtres.statuts.length > 0 && !filtres.statuts.includes(dossier.statut)) return false
  if (filtres.grades.length > 0 && !filtres.grades.includes(dossier.grade)) return false
  if (filtres.sexe !== undefined && dossier.sexe !== filtres.sexe) return false

  if (
    filtres.etablissementId !== undefined &&
    dossier.etablissement.id !== filtres.etablissementId
  ) {
    return false
  }
  if (filtres.departementId !== undefined && dossier.departement.id !== filtres.departementId) {
    return false
  }
  if (filtres.regionId !== undefined && dossier.regionOrigine?.id !== filtres.regionId) {
    return false
  }
  if (
    filtres.departementOrigineId !== undefined &&
    dossier.departementOrigine?.id !== filtres.departementOrigineId
  ) {
    return false
  }

  if (filtres.resident !== undefined && dossier.estResident !== filtres.resident) return false
  if (
    filtres.collaboration !== undefined &&
    dossier.contratCollaboration !== filtres.collaboration
  ) {
    return false
  }
  if (filtres.responsabilite !== undefined) {
    const aUnPoste = (dossier.posteResponsabilite ?? '').trim() !== ''
    if (aUnPoste !== filtres.responsabilite) return false
  }

  // Classe, échelon : une position sans classe (Stagiaire, Hors échelle…) ne correspond jamais.
  if (filtres.classe !== undefined && dossier.position.classe !== filtres.classe) return false
  if (filtres.echelon !== undefined && dossier.position.echelon !== filtres.echelon) return false
  if (filtres.indiceMin !== undefined && dossier.position.indice < filtres.indiceMin) return false
  if (filtres.indiceMax !== undefined && dossier.position.indice > filtres.indiceMax) return false

  if (!dansPlage(dossier.dateNaissance, plageDe(filtres.naissance))) return false
  if (!dansPlage(dossier.datePriseService, plageDe(filtres.priseService))) return false

  return correspondALaRecherche(dossier, filtres.recherche)
}

/**
 * Une date calculée satisfait-elle un critère d'échéance ? « Passée » : le jour est atteint
 * (aujourd'hui compris, comme pour l'alerte d'éligibilité à la retraite) ; « à venir » : après
 * aujourd'hui. L'année et la plage se combinent à l'échéance (le ET de tous les critères).
 * Un critère non renseigné ne restreint rien ; une date absente ne correspond à aucun critère
 * renseigné.
 */
function respecteEcheance(date: Date | null, critere: CritereEcheance, jour: Date): boolean {
  if (critereEcheanceVide(critere)) return true
  if (date === null) return false
  const ecart = debutDeJour(date).getTime() - debutDeJour(jour).getTime()
  if (critere.echeance === 'passee' && ecart > 0) return false
  if (critere.echeance === 'future' && ecart <= 0) return false
  return dansPlage(date, plageDe(critere))
}

/**
 * Les critères qui portent sur la carrière calculée (date de retraite, prochain avancement).
 * Séparés de correspondAuxFiltres() parce qu'ils ont besoin de la situation du dossier et du
 * jour courant, que le dossier seul ne contient pas.
 */
export function correspondALaSituation(
  ligne: LigneRecherche,
  filtres: FiltresEnseignants,
  jour: Date
): boolean {
  return (
    respecteEcheance(ligne.situation.dateRetraite, filtres.retraite, jour) &&
    respecteEcheance(ligne.situation.dateProchainAvancement, filtres.avancement, jour)
  )
}

/**
 * Tous les critères : ceux du dossier, ceux de sa situation de carrière, ceux de ses absences
 * (qui dépendent eux aussi du jour courant).
 */
export function ligneCorrespond(
  ligne: LigneRecherche,
  filtres: FiltresEnseignants,
  jour: Date
): boolean {
  return (
    correspondAuxFiltres(ligne.dossier, filtres) &&
    correspondALaSituation(ligne, filtres, jour) &&
    correspondAuxAbsences(ligne.dossier, filtres.absence, jour)
  )
}
