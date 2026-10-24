import type { PalierIndiciaire } from '../avancement/calculerProchainEchelon'
import { formaterDateIso } from '../dates/jourCivil'
import type { DossierEnseignant } from '../enseignants/dossier'
import { filtresVides } from '../enseignants/recherche/filtres'
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

export const CLES_EDITION = ['retraite', 'transferes', 'collaboration'] as const
export type CleEdition = (typeof CLES_EDITION)[number]

/** Ce que l'utilisateur demande : une liste, avec ses paramètres déjà contrôlés. */
export type DemandeEdition =
  | { cle: 'retraite'; annee: number }
  | { cle: 'transferes' }
  | { cle: 'collaboration' }

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
}

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
): LigneRecherche[] {
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
  }
}

function radicalFichier(demande: DemandeEdition): string {
  switch (demande.cle) {
    case 'retraite':
      return `retraites-${demande.annee}`
    case 'transferes':
      return 'transferes'
    case 'collaboration':
      return 'collaboration'
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
