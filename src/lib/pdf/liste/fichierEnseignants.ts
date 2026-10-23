import { anneeDe } from '@/domain/dates/jourCivil'
import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { calculerDateRetraitePrevue } from '@/domain/enseignants/retraite'
import { LIBELLES_GRADE_PLURIEL, ORDRE_GRADE } from '@/domain/enseignants/grade'
import type { DossierEnseignant } from '@/domain/enseignants/dossier'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'
import { construireHtmlListe, type ColonneListe, type SectionListe } from './documentListe'

/**
 * « Fichier des enseignants » : la liste officielle à 18 colonnes, un établissement par page,
 * les enseignants regroupés par grade. Ce fichier ne contient que la composition de cette liste
 * (colonnes, tri, regroupement) ; la mise en page est celle du cadre commun (documentListe.ts).
 */

export type EnseignantPourFichier = {
  matricule: string
  nom: string
  prenom: string
  dateNaissance: Date
  lieuNaissance: string
  sexe: string
  grade: string
  domaineRecherche: string | null
  datePriseService: Date
  estResident: boolean
  contratCollaboration: boolean
  posteResponsabilite: string | null
  telephone: string | null
  email: string | null
  departementOrigine: { nom: string; region: { nom: string } } | null
}

export type EtablissementPourFichier = {
  nom: string
  departements: { nom: string; enseignants: EnseignantPourFichier[] }[]
}

export type LigneFichier = {
  enseignant: EnseignantPourFichier
  nomDepartement: string
  /** Année du départ à la retraite, déjà calculée (vide quand il n'y en a pas). */
  anneeRetraite: string
}

const ouiNon = (valeur: boolean) => (valeur ? 'Oui' : 'Non')

/**
 * Les largeurs (en mm) ont été dimensionnées sur des mesures réelles : chaque mot d'en-tête
 * (« Collaboration », « Responsabilité »…) et chaque valeur d'un seul bloc (date, matricule,
 * téléphone) tient dans sa colonne. Le total, avec la colonne « N° », fait la largeur de la feuille.
 */
export const COLONNES_FICHIER_ENSEIGNANTS: ColonneListe<LigneFichier>[] = [
  {
    entete: 'Noms et Prénoms',
    largeur: 25,
    valeur: ({ enseignant: e }) => `${e.nom} ${e.prenom}`,
  },
  {
    entete: 'Date de Naissance',
    largeur: 14,
    insecable: true,
    valeur: ({ enseignant: e }) => formaterDateCourte(e.dateNaissance),
  },
  { entete: 'Lieu de Naissance', largeur: 16, valeur: ({ enseignant: e }) => e.lieuNaissance },
  {
    entete: 'Matricule solde',
    largeur: 14,
    insecable: true,
    valeur: ({ enseignant: e }) => e.matricule,
  },
  {
    entete: 'Grade',
    largeur: 15.5,
    valeur: ({ enseignant: e }) => LIBELLES_GRADE_PLURIEL[e.grade] ?? e.grade,
  },
  { entete: 'Sexe', largeur: 7, valeur: ({ enseignant: e }) => e.sexe },
  {
    entete: 'Domaine de Recherche',
    largeur: 18.5,
    valeur: ({ enseignant: e }) => e.domaineRecherche ?? '',
  },
  { entete: "Département d'attache", largeur: 18, valeur: ({ nomDepartement }) => nomDepartement },
  {
    entete: 'Date de Prise de service',
    largeur: 14,
    insecable: true,
    valeur: ({ enseignant: e }) => formaterDateCourte(e.datePriseService),
  },
  {
    entete: 'Année de retraite',
    largeur: 10,
    insecable: true,
    valeur: ({ anneeRetraite }) => anneeRetraite,
  },
  {
    entete: 'Résident (Oui/Non)',
    largeur: 12.7,
    valeur: ({ enseignant: e }) => ouiNon(e.estResident),
  },
  {
    entete: 'Contrat de Collaboration',
    largeur: 16.7,
    valeur: ({ enseignant: e }) => ouiNon(e.contratCollaboration),
  },
  {
    entete: "Région d'origine",
    largeur: 13.5,
    valeur: ({ enseignant: e }) => e.departementOrigine?.region.nom ?? '',
  },
  {
    entete: "Département d'origine",
    largeur: 16,
    valeur: ({ enseignant: e }) => e.departementOrigine?.nom ?? '',
  },
  {
    entete: 'Poste de Responsabilité',
    largeur: 17.5,
    valeur: ({ enseignant: e }) => e.posteResponsabilite ?? '',
  },
  {
    entete: 'N° Téléphone',
    largeur: 14,
    valeur: ({ enseignant: e }) => e.telephone ?? '',
  },
  {
    entete: 'Adresse Mail',
    largeur: 27.6,
    coupureDouce: true,
    valeur: ({ enseignant: e }) => e.email ?? '',
  },
]

/**
 * Une section par établissement. On aplatit D'ABORD tous les enseignants de l'établissement
 * (quel que soit leur département), PUIS on groupe par grade — pas l'inverse : le document de
 * référence trie par nom à l'intérieur de chaque grade en mélangeant librement les
 * départements (vérifié sur le rapport d'avancement fourni).
 */
export function sectionsFichierEnseignants(
  etablissements: EtablissementPourFichier[]
): SectionListe<LigneFichier>[] {
  return etablissements.map((etablissement) => {
    const lignes: LigneFichier[] = etablissement.departements
      .flatMap((departement) =>
        departement.enseignants.map((enseignant) => ({
          enseignant,
          nomDepartement: departement.nom,
          anneeRetraite: String(
            anneeDe(calculerDateRetraitePrevue(enseignant.dateNaissance, enseignant.grade))
          ),
        }))
      )
      .sort(
        (a, b) =>
          a.enseignant.nom.localeCompare(b.enseignant.nom, 'fr') ||
          a.enseignant.prenom.localeCompare(b.enseignant.prenom, 'fr')
      )

    return {
      titre: etablissement.nom,
      groupes: ORDRE_GRADE.map((grade) => ({
        titre: LIBELLES_GRADE_PLURIEL[grade],
        lignes: lignes.filter((ligne) => ligne.enseignant.grade === grade),
      })),
    }
  })
}

export function construireHtmlFichierEnseignants(
  etablissements: EtablissementPourFichier[]
): string {
  return construireHtmlListe({
    enteteGauche: "Fichier des enseignants de l'Université de Ngaoundéré",
    enteteDroite: 'UN/R/VR-EPDTIC/SG/DAAC/DEPE/SSPE',
    colonnes: COLONNES_FICHIER_ENSEIGNANTS,
    sections: sectionsFichierEnseignants(etablissements),
    messageSiVide: 'Aucun enseignant à afficher.',
  })
}

/** Un dossier de la recherche, sous la forme que la liste officielle attend. */
function enseignantPourFichier(dossier: DossierEnseignant): EnseignantPourFichier {
  return {
    matricule: dossier.matricule,
    nom: dossier.nom,
    prenom: dossier.prenom,
    dateNaissance: dossier.dateNaissance,
    lieuNaissance: dossier.lieuNaissance,
    sexe: dossier.sexe,
    grade: dossier.grade,
    domaineRecherche: dossier.domaineRecherche,
    datePriseService: dossier.datePriseService,
    estResident: dossier.estResident,
    contratCollaboration: dossier.contratCollaboration,
    posteResponsabilite: dossier.posteResponsabilite,
    telephone: dossier.telephone,
    email: dossier.email,
    departementOrigine:
      dossier.departementOrigine && dossier.regionOrigine
        ? { nom: dossier.departementOrigine.nom, region: { nom: dossier.regionOrigine.nom } }
        : null,
  }
}

/**
 * Une sélection de la recherche, mise en forme comme la liste officielle : un établissement par
 * page (par ordre alphabétique), les enseignants regroupés par grade. À l'intérieur d'un grade,
 * l'ordre est CELUI DE LA SÉLECTION (le tri choisi à l'écran : par nom, par date de retraite…) :
 * on ne le recalcule pas. L'année de retraite est celle de la situation de carrière : la date
 * réellement enregistrée pour un retraité, la date théorique pour un actif, vide pour un transféré.
 */
export function sectionsFichierSelection(
  lignes: readonly LigneRecherche[],
  sousTitre?: string
): SectionListe<LigneFichier>[] {
  const parEtablissement = new Map<string, { nom: string; lignes: LigneRecherche[] }>()
  for (const ligne of lignes) {
    const { id, nom } = ligne.dossier.etablissement
    const entree = parEtablissement.get(id) ?? { nom, lignes: [] }
    entree.lignes.push(ligne)
    parEtablissement.set(id, entree)
  }

  return [...parEtablissement.values()]
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .map((etablissement) => ({
      titre: etablissement.nom,
      sousTitre,
      groupes: ORDRE_GRADE.map((grade) => ({
        titre: LIBELLES_GRADE_PLURIEL[grade],
        lignes: etablissement.lignes
          .filter((ligne) => ligne.dossier.grade === grade)
          .map(({ dossier, situation }) => ({
            enseignant: enseignantPourFichier(dossier),
            nomDepartement: dossier.departement.nom,
            anneeRetraite: situation.dateRetraite ? String(anneeDe(situation.dateRetraite)) : '',
          })),
      })),
    }))
}

export function construireHtmlFichierSelection(
  lignes: readonly LigneRecherche[],
  sousTitre?: string
): string {
  return construireHtmlListe({
    enteteGauche: "Fichier des enseignants de l'Université de Ngaoundéré",
    enteteDroite: 'UN/R/VR-EPDTIC/SG/DAAC/DEPE/SSPE',
    colonnes: COLONNES_FICHIER_ENSEIGNANTS,
    sections: sectionsFichierSelection(lignes, sousTitre),
    messageSiVide: 'Aucun enseignant ne correspond à la sélection.',
  })
}
