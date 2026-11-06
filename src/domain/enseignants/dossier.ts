/**
 * Le dossier d'un enseignant tel que le voient la recherche, les listes et les exports :
 * tout ce qu'il faut, déjà rassemblé, sans dépendre de Prisma. La couche qui lit la base
 * (src/lib/enseignants/chargerDossiers.ts) remplit cette forme ; les règles de filtrage, de
 * tri et de mise en page n'en connaissent pas d'autre.
 */

export const GRADES = [
  'PROFESSEUR',
  'MAITRE_DE_CONFERENCES',
  'CHARGE_DE_COURS',
  'ASSISTANT',
] as const
export type Grade = (typeof GRADES)[number]

export const STATUTS_ENSEIGNANT = ['ACTIF', 'TRANSFERE', 'RETRAITE'] as const
export type StatutEnseignant = (typeof STATUTS_ENSEIGNANT)[number]

export const LIBELLES_STATUT_ENSEIGNANT: Record<StatutEnseignant, string> = {
  ACTIF: 'Actif',
  TRANSFERE: 'Transféré',
  RETRAITE: 'Retraité',
}

export const SEXES = ['M', 'F'] as const
export type Sexe = (typeof SEXES)[number]

export const LIBELLES_SEXE: Record<Sexe, string> = { M: 'Masculin', F: 'Féminin' }

export const TYPES_ABSENCE = [
  'MISSION',
  'CONGE_MATERNITE',
  'CONGE_MALADIE',
  'CONGE_ADMINISTRATIF',
  'AUTRE',
] as const
export type TypeAbsence = (typeof TYPES_ABSENCE)[number]

export const STATUTS_ABSENCE = ['EN_ATTENTE', 'EN_PERIODE', 'DEPASSE', 'TERMINE'] as const
export type StatutAbsence = (typeof STATUTS_ABSENCE)[number]

export type AbsenceDossier = {
  id: string
  type: TypeAbsence
  statut: StatutAbsence
  dateDebut: Date
  dateFin: Date
  dateRetour: Date | null
  motif: string | null
}

export type DossierEnseignant = {
  id: string
  matricule: string
  nom: string
  prenom: string
  photoUrl: string | null
  sexe: Sexe
  grade: Grade
  statut: StatutEnseignant
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
  telephone: string | null
  email: string | null
  departement: { id: string; nom: string }
  etablissement: { id: string; nom: string; abreviation: string }
  departementOrigine: { id: string; nom: string } | null
  regionOrigine: { id: string; nom: string } | null
  /** Position actuelle dans la grille indiciaire (classe, échelon, indice). */
  position: {
    grade: Grade
    ordre: number
    classe: number | null
    echelon: number | null
    indice: number
    sousCategorie: string | null
  }
  absences: AbsenceDossier[]
}
