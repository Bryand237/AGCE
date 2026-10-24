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

export const CLES_EDITION = ['retraite'] as const
export type CleEdition = (typeof CLES_EDITION)[number]

/** Ce que l'utilisateur demande : une liste, avec ses paramètres déjà contrôlés. */
export type DemandeEdition = { cle: 'retraite'; annee: number }

export const DEFINITIONS_EDITION: Record<CleEdition, { titre: string; description: string }> = {
  retraite: {
    titre: 'Enseignants à la retraite',
    description:
      "Les enseignants dont le départ à la retraite tombe dans l'année choisie. Pour un enseignant " +
      'en activité, la date est calculée (naissance + âge de retraite de son grade) ; pour un ' +
      'retraité, c’est la date enregistrée dans son dossier.',
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
  }
}

/** Titre imprimé sous le nom de l'établissement. */
export function titreEdition(demande: DemandeEdition): string {
  switch (demande.cle) {
    case 'retraite':
      return `Liste des enseignants à la retraite en ${demande.annee}`
  }
}

/** Phrase imprimée quand la liste est vide (aucun établissement n'a de ligne à montrer). */
export function messageEditionVide(demande: DemandeEdition): string {
  switch (demande.cle) {
    case 'retraite':
      return `Aucun enseignant à la retraite en ${demande.annee}.`
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
  }
}

function radicalFichier(demande: DemandeEdition): string {
  switch (demande.cle) {
    case 'retraite':
      return `retraites-${demande.annee}`
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
