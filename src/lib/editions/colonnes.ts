import type { DemandeEdition } from '@/domain/editions/editions'
import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { abreviationGrade, abreviationRegion } from '@/domain/enseignants/abreviations'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'
import type { ColonneListe } from '@/lib/pdf/liste/documentListe'

/**
 * Colonnes des listes officielles (« éditions »), dans l'ordre demandé par l'administration :
 * l'identité de l'enseignant, son affectation, puis les colonnes PROPRES à la liste, puis son
 * origine. Le PDF et le tableur partent de la même description, pour qu'ils ne divergent jamais.
 *
 * Sur papier, le grade et la région sont abrégés (« PR », « OU »), faute de place, et une légende
 * en bas de page explique les sigles. Dans le tableur, il n'y a pas de contrainte de largeur : les
 * mêmes colonnes donnent le nom complet, plus facile à filtrer et à trier (`valeurCsv`).
 */
export type ColonneEdition = ColonneListe<LigneRecherche> & {
  /** Valeur dans le tableur, quand elle diffère de celle du PDF (nom complet au lieu du sigle). */
  valeurCsv?: (ligne: LigneRecherche) => string
}

const dateOuVide = (date: Date | null): string => (date === null ? '' : formaterDateCourte(date))

/**
 * Les largeurs (en mm) sont ramenées à la largeur de la feuille par le cadre commun : seules leurs
 * proportions comptent. Elles ont été choisies sur des mesures réelles, pour que chaque mot
 * d'en-tête et chaque date tiennent dans leur colonne.
 */
const COLONNES_IDENTITE: ColonneEdition[] = [
  {
    entete: 'Nom et prénom',
    largeur: 38,
    valeur: ({ dossier }) => `${dossier.nom} ${dossier.prenom}`,
  },
  {
    entete: 'Date de Naissance',
    largeur: 17,
    insecable: true,
    valeur: ({ dossier }) => formaterDateCourte(dossier.dateNaissance),
  },
  { entete: 'Lieu de Naissance', largeur: 23, valeur: ({ dossier }) => dossier.lieuNaissance },
  {
    entete: 'Matricule solde',
    largeur: 17,
    insecable: true,
    valeur: ({ dossier }) => dossier.matricule,
  },
  {
    entete: 'Grade',
    largeur: 11,
    valeur: ({ dossier }) => abreviationGrade(dossier.grade),
    valeurCsv: ({ dossier }) => LIBELLES_GRADE[dossier.grade] ?? dossier.grade,
  },
  { entete: 'Sexe', largeur: 10, valeur: ({ dossier }) => dossier.sexe },
  {
    entete: 'Domaine de recherche',
    largeur: 30,
    valeur: ({ dossier }) => dossier.domaineRecherche ?? '',
  },
  {
    entete: "Département d'attache",
    largeur: 30,
    valeur: ({ dossier }) => dossier.departement.nom,
  },
  {
    entete: 'Date de prise de service',
    largeur: 17,
    insecable: true,
    valeur: ({ dossier }) => formaterDateCourte(dossier.datePriseService),
  },
]

const COLONNES_ORIGINE: ColonneEdition[] = [
  {
    entete: "Région d'origine",
    largeur: 15,
    valeur: ({ dossier }) =>
      dossier.regionOrigine ? abreviationRegion(dossier.regionOrigine.nom) : '',
    valeurCsv: ({ dossier }) => dossier.regionOrigine?.nom ?? '',
  },
  {
    entete: "Département d'origine",
    largeur: 28,
    valeur: ({ dossier }) => dossier.departementOrigine?.nom ?? '',
  },
]

/** Les colonnes qui ne concernent que cette liste (entre la prise de service et l'origine). */
function colonnesPropres(demande: DemandeEdition): ColonneEdition[] {
  switch (demande.cle) {
    case 'retraite':
      return [
        {
          entete: 'Date de retraite',
          largeur: 17,
          insecable: true,
          valeur: ({ situation }) => dateOuVide(situation.dateRetraite),
        },
      ]
    case 'transferes':
      return [
        {
          // La date de fin de service d'un transféré EST la date effective de son transfert.
          entete: 'Date de transfert',
          largeur: 17,
          insecable: true,
          valeur: ({ dossier }) => dateOuVide(dossier.dateFinService),
        },
        {
          entete: "Université d'accueil",
          largeur: 24,
          valeur: ({ dossier }) => dossier.lieuTransfert ?? '',
        },
      ]
    case 'collaboration':
      // Le dossier ne dit que « oui » ou « non » : les dates du contrat n'existent pas en base.
      // Les deux colonnes restent dans la liste (elles sont demandées) mais sortent vides.
      return [
        {
          entete: 'Date de début de la collaboration',
          largeur: 21,
          insecable: true,
          valeur: () => '',
        },
        {
          entete: 'Date de fin de la collaboration',
          largeur: 21,
          insecable: true,
          valeur: () => '',
        },
      ]
  }
}

export function colonnesEdition(demande: DemandeEdition): ColonneEdition[] {
  return [...COLONNES_IDENTITE, ...colonnesPropres(demande), ...COLONNES_ORIGINE]
}
