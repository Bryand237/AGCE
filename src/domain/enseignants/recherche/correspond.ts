import { dansPlage } from '../../dates/plage'
import { motsNormalises, normaliserTexte } from '../../texte/normaliserTexte'
import type { DossierEnseignant } from '../dossier'
import { plageDe } from './filtres'
import type { FiltresEnseignants } from './filtres'

/** Textes dans lesquels la recherche libre cherche chaque mot, sous leur forme de comparaison. */
function textesRecherchables(dossier: DossierEnseignant): { champs: string[]; matricule: string } {
  const matricule = normaliserTexte(dossier.matricule)
  return {
    champs: [
      normaliserTexte(dossier.nom),
      normaliserTexte(dossier.prenom),
      matricule,
      normaliserTexte(dossier.domaineRecherche ?? ''),
      normaliserTexte(dossier.lieuNaissance),
    ],
    // « 0652125K » doit trouver « 0652 125K » : on cherche aussi dans le matricule sans espace.
    matricule: matricule.replace(/ /g, ''),
  }
}

function correspondALaRecherche(dossier: DossierEnseignant, recherche: string): boolean {
  const mots = motsNormalises(recherche)
  if (mots.length === 0) return true
  const { champs, matricule } = textesRecherchables(dossier)
  // Chaque mot doit se retrouver quelque part : « Alice Mbarga » trouve Alice MBARGA.
  return mots.every((mot) => matricule.includes(mot) || champs.some((champ) => champ.includes(mot)))
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
