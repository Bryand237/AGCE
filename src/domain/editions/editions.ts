import type { PalierIndiciaire } from '../avancement/calculerProchainEchelon'
import { formaterDateIso } from '../dates/jourCivil'
import { absenceRepondAuCritere } from '../enseignants/recherche/correspondAbsences'
import type { AbsenceDossier, DossierEnseignant, TypeAbsence } from '../enseignants/dossier'
import { critereAbsenceNeutre, filtresVides } from '../enseignants/recherche/filtres'
import type { CritereAbsence } from '../enseignants/recherche/filtres'
import { selectionnerDossiers } from '../enseignants/recherche/selectionner'
import type { LigneRecherche } from '../enseignants/recherche/trier'

/**
 * Les « éditions » : les listes officielles demandées par l'administration, chacune classée par
 * établissement (enseignants à la retraite en telle année, transférés, sous contrat de
 * collaboration…). Une édition est une SÉLECTION de dossiers (même moteur que la recherche) à
 * laquelle on ajoute ce qui est propre à la liste : son titre, ses paramètres, son nom de fichier.
 * La mise en page (colonnes, PDF, CSV) est dans src/lib/editions.
 *
 * Pour ajouter une liste : une clé dans CLES_EDITION, son entrée dans DEFINITIONS_EDITION et dans
 * DemandeEdition, puis les quatre fonctions ci-dessous (le compilateur signale celles qui
 * manquent : chaque `switch` est exhaustif).
 */

export const CLES_EDITION = [
  'retraite',
  'transferes',
  'collaboration',
  'conges',
  'missions',
] as const
export type CleEdition = (typeof CLES_EDITION)[number]

/** Ce que l'utilisateur demande : une liste, avec ses paramètres déjà contrôlés. */
export type DemandeEdition =
  | { cle: 'retraite'; annee: number }
  | { cle: 'transferes' }
  | { cle: 'collaboration' }
  | { cle: 'conges' }
  | { cle: 'missions' }

/**
 * Une ligne d'une liste : un enseignant et sa situation de carrière. Les listes d'absences y
 * ajoutent l'absence qui l'y a fait figurer : un enseignant a autant de lignes que d'absences
 * qui répondent à la liste (en général une).
 */
export type LigneEdition = LigneRecherche & { absence?: AbsenceDossier }

export const DEFINITIONS_EDITION: Record<
  CleEdition,
  {
    titre: string
    description: string
    /** Avertissement affiché avec la liste quand elle ne peut pas être complète. */
    avertissement?: string
  }
> = {
  retraite: {
    titre: 'Enseignants à la retraite',
    description:
      "Les enseignants dont le départ à la retraite tombe dans l'année choisie. Pour un enseignant " +
      'en activité, la date est calculée (naissance + âge de retraite de son grade) ; pour un ' +
      'retraité, c’est la date enregistrée dans son dossier.',
  },
  transferes: {
    titre: 'Enseignants transférés',
    description:
      "Les enseignants transférés hors de l'université, avec la date de leur transfert et " +
      "l'université d'accueil enregistrées dans leur dossier.",
  },
  collaboration: {
    titre: 'Enseignants sous contrat de collaboration',
    description:
      'Les enseignants en activité ou retraités dont le dossier porte un contrat de collaboration. ' +
      "Un enseignant transféré hors de l'université n'y figure pas.",
    avertissement:
      'Les dates de début et de fin du contrat ne sont pas enregistrées dans la base : ces deux ' +
      'colonnes sortent vides, à compléter à la main ou dans Excel.',
  },
  conges: {
    titre: 'Enseignants en congé de maternité ou de maladie',
    description:
      'Les enseignants en activité actuellement en congé de maternité ou de maladie, avec les dates ' +
      "du congé, y compris ceux dont le retour n'est pas encore enregistré. Aucun motif n'est imprimé.",
  },
  missions: {
    titre: 'Enseignants en mission',
    description:
      'Les enseignants en activité actuellement en mission, avec les dates de la mission, y ' +
      "compris ceux dont le retour n'est pas encore enregistré.",
    avertissement:
      "La base n'indique ni le lieu d'accueil ni si la mission est à l'étranger : la liste " +
      "reprend toutes les missions en cours, et la colonne « Lieu d'accueil / motif » reproduit " +
      "le motif saisi à la création de l'absence.",
  },
}

/**
 * Liste demandée par le client mais impossible aujourd'hui : le dossier d'un enseignant ne dit
 * pas qu'il est décédé (pas de statut « décédé », pas de date de décès), et la base ne se modifie
 * pas sans l'accord de son propriétaire. Elle n'a donc ni clé, ni route, ni fichier : la page
 * « Éditions » l'affiche désactivée, avec cette raison, pour que son absence soit expliquée et non
 * un oubli. Elle se construira comme les autres dès que ces deux informations existeront.
 */
export const EDITION_INDISPONIBLE_DECES = {
  titre: 'Enseignants décédés',
  description: 'Les enseignants décédés, avec leur date de décès, établissement par établissement.',
  raison:
    "Cette liste n'est pas disponible : le dossier d'un enseignant n'a ni statut « décédé » ni " +
    'date de décès, et la base de données ne peut pas être modifiée sans accord de son ' +
    'propriétaire. Dès que ces deux informations pourront être enregistrées, la liste se ' +
    'construira comme les autres.',
} as const

/** Bornes des années acceptées : large pour ne rien refuser de plausible, étroite pour une faute de frappe. */
export const ANNEE_MIN = 1950
export const ANNEE_MAX = 2100

/** « 2027 » devient 2027 ; tout le reste (vide, « 27 », « 2027.5 », « abc », hors bornes) : undefined. */
export function lireAnneeEdition(valeur: string | null | undefined): number | undefined {
  const texte = valeur?.trim()
  if (texte === undefined || !/^\d{4}$/.test(texte)) return undefined
  const annee = Number(texte)
  return annee >= ANNEE_MIN && annee <= ANNEE_MAX ? annee : undefined
}

export function lireCleEdition(valeur: string): CleEdition | undefined {
  return CLES_EDITION.find((cle) => cle === valeur)
}

export type ErreurEdition = {
  code: 'EDITION_INCONNUE' | 'PARAMETRE_INVALIDE'
  message: string
}
export type LectureEdition = { demande: DemandeEdition } | { erreur: ErreurEdition }

/**
 * Lit une demande dans l'adresse d'un export : la clé de la liste (segment d'URL) et ses
 * paramètres. Contrairement aux filtres de la recherche, rien n'est « rattrapé » ici : un
 * document imprimé porte son année dans son titre, et une année remplacée sans prévenir par une
 * autre produirait un faux document. Une demande invalide est donc refusée, avec son motif.
 */
export function lireDemandeEdition(
  cle: string,
  parametres: { get(nom: string): string | null }
): LectureEdition {
  const cleConnue = lireCleEdition(cle)
  if (cleConnue === undefined) {
    return { erreur: { code: 'EDITION_INCONNUE', message: `Liste inconnue : « ${cle} ».` } }
  }
  switch (cleConnue) {
    case 'retraite': {
      const annee = lireAnneeEdition(parametres.get('annee'))
      if (annee === undefined) {
        return {
          erreur: {
            code: 'PARAMETRE_INVALIDE',
            message: `Année invalide : indiquez une année de ${ANNEE_MIN} à ${ANNEE_MAX} (par exemple ?annee=2027).`,
          },
        }
      }
      return { demande: { cle: 'retraite', annee } }
    }
    // Ces listes n'ont aucun paramètre : ce que l'adresse contient d'autre est ignoré.
    case 'transferes':
      return { demande: { cle: 'transferes' } }
    case 'collaboration':
      return { demande: { cle: 'collaboration' } }
    case 'conges':
      return { demande: { cle: 'conges' } }
    case 'missions':
      return { demande: { cle: 'missions' } }
  }
}

/** Titre imprimé sous le nom de l'établissement. */
export function titreEdition(demande: DemandeEdition): string {
  switch (demande.cle) {
    case 'retraite':
      return `Liste des enseignants à la retraite en ${demande.annee}`
    case 'transferes':
      return 'Liste des enseignants transférés'
    case 'collaboration':
      return 'Liste des enseignants sous contrat de collaboration'
    case 'conges':
      return 'Liste des enseignants en congé de maternité ou de maladie'
    case 'missions':
      return 'Liste des enseignants en mission'
  }
}

/** Phrase imprimée quand la liste est vide (aucun établissement n'a de ligne à montrer). */
export function messageEditionVide(demande: DemandeEdition): string {
  switch (demande.cle) {
    case 'retraite':
      return `Aucun enseignant à la retraite en ${demande.annee}.`
    case 'transferes':
      return 'Aucun enseignant transféré.'
    case 'collaboration':
      return 'Aucun enseignant sous contrat de collaboration.'
    case 'conges':
      return 'Aucun enseignant en congé de maternité ou de maladie.'
    case 'missions':
      return 'Aucun enseignant en mission.'
  }
}

/**
 * Les enseignants de la liste, dans l'ordre où ils s'impriment à l'intérieur d'un établissement.
 * C'est la même sélection que celle de l'écran de recherche : une édition n'est qu'un filtre
 * nommé, donc ce que la page « Éditions » compte est exactement ce que le PDF liste.
 */
export function selectionnerEdition(
  demande: DemandeEdition,
  dossiers: readonly DossierEnseignant[],
  grille: PalierIndiciaire[],
  jour: Date
): LigneEdition[] {
  switch (demande.cle) {
    case 'retraite':
      // Date de retraite dans l'année : réelle pour un retraité, calculée pour un actif ; un
      // transféré n'en a pas et n'y figure donc jamais. Du plus tôt au plus tard, puis par nom.
      return selectionnerDossiers(
        dossiers,
        {
          ...filtresVides(),
          retraite: { annee: demande.annee },
          tri: 'retraite',
          ordre: 'asc',
        },
        grille,
        jour
      )
    case 'transferes':
      return selectionnerDossiers(
        dossiers,
        { ...filtresVides(), statuts: ['TRANSFERE'] },
        grille,
        jour
      )
    case 'collaboration':
      // Un transféré a quitté l'université : son contrat n'est plus un contrat de l'université.
      return selectionnerDossiers(
        dossiers,
        { ...filtresVides(), collaboration: true, statuts: ['ACTIF', 'RETRAITE'] },
        grille,
        jour
      )
    case 'conges':
      return absencesEnCours(['CONGE_MATERNITE', 'CONGE_MALADIE'], dossiers, grille, jour)
    case 'missions':
      return absencesEnCours(['MISSION'], dossiers, grille, jour)
  }
}

/**
 * Les absences de ces types qui occupent un enseignant EN ACTIVITÉ aujourd'hui : celles en cours
 * et celles dont la fin prévue est passée sans retour enregistré (il est donc toujours absent
 * d'après le dossier ; les dates imprimées montrent l'anomalie). Les absences à venir ou
 * terminées n'y sont pas ; un retraité ou un transféré n'est plus « en congé » ni « en mission »
 * pour l'université, même si une ancienne absence est restée ouverte.
 *
 * Une ligne par absence, de la plus ancienne à la plus récente, puis par nom (le tri est stable
 * et la sélection de départ est déjà rangée par nom).
 */
function absencesEnCours(
  types: TypeAbsence[],
  dossiers: readonly DossierEnseignant[],
  grille: PalierIndiciaire[],
  jour: Date
): LigneEdition[] {
  const critere: CritereAbsence = {
    ...critereAbsenceNeutre(),
    types,
    etats: ['en-cours', 'depassee'],
  }
  const actifs = selectionnerDossiers(
    dossiers,
    { ...filtresVides(), statuts: ['ACTIF'] },
    grille,
    jour
  )
  return actifs
    .flatMap((ligne) =>
      ligne.dossier.absences
        .filter((absence) => absenceRepondAuCritere(absence, critere, jour))
        .map((absence) => ({ ...ligne, absence }))
    )
    .sort((a, b) => a.absence.dateDebut.getTime() - b.absence.dateDebut.getTime())
}

/**
 * Combien d'enseignants une liste contient. Une liste d'absences a une ligne par absence : un
 * enseignant qui aurait deux congés en cours y figure deux fois, mais ne compte qu'une fois.
 */
export function nombreEnseignants(lignes: readonly { dossier: { id: string } }[]): number {
  return new Set(lignes.map(({ dossier }) => dossier.id)).size
}

function radicalFichier(demande: DemandeEdition): string {
  switch (demande.cle) {
    case 'retraite':
      return `retraites-${demande.annee}`
    case 'transferes':
      return 'transferes'
    case 'collaboration':
      return 'collaboration'
    case 'conges':
      return 'conges'
    case 'missions':
      return 'missions'
  }
}

/** « retraites-2027_edition-2026-10-23.pdf » : la liste, puis le jour d'édition, pour classer les fichiers. */
export function nomFichierEdition(
  demande: DemandeEdition,
  jour: Date,
  extension: 'pdf' | 'csv'
): string {
  return `${radicalFichier(demande)}_edition-${formaterDateIso(jour)}.${extension}`
}
