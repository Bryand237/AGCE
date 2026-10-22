import type { DossierEnseignant } from '@/domain/enseignants/dossier'

/**
 * Forme exacte de ce que la requête de chargerDossiers.ts lit dans la base. Définie ici (et non
 * déduite de Prisma) pour que la conversion reste testable sans base de données ; si la requête
 * et ce type divergent, le contrôle de types le signale à la compilation.
 */
export type LigneEnseignant = {
  id: string
  matricule: string
  nom: string
  prenom: string
  photoUrl: string | null
  sexe: DossierEnseignant['sexe']
  grade: DossierEnseignant['grade']
  statut: DossierEnseignant['statut']
  dateNaissance: Date
  lieuNaissance: string
  datePriseService: Date
  dateEffetEchelon: Date
  dateFinService: Date | null
  lieuTransfert: string | null
  domaineRecherche: string | null
  estResident: boolean
  contratCollaboration: boolean
  posteResponsabilite: string | null
  departement: {
    id: string
    nom: string
    etablissement: { id: string; nom: string; abreviation: string }
  }
  departementOrigine: { id: string; nom: string; region: { id: string; nom: string } } | null
  positionActuelle: DossierEnseignant['position']
  absences: DossierEnseignant['absences']
}

/** Aplatit une ligne de la base en dossier : l'établissement et la région remontent d'un niveau. */
export function versDossier(ligne: LigneEnseignant): DossierEnseignant {
  const { departement, departementOrigine, positionActuelle, ...reste } = ligne
  return {
    ...reste,
    departement: { id: departement.id, nom: departement.nom },
    etablissement: departement.etablissement,
    departementOrigine: departementOrigine
      ? { id: departementOrigine.id, nom: departementOrigine.nom }
      : null,
    regionOrigine: departementOrigine ? departementOrigine.region : null,
    position: positionActuelle,
  }
}
