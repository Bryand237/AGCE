import { croiserPlages, plageDeLAnnee } from '../../dates/plage'
import type { PlageDates } from '../../dates/plage'
import type { Grade, Sexe, StatutEnseignant } from '../dossier'

/**
 * Critère de date : une année, une plage « du … au … », ou les deux (l'intersection). On garde
 * ce que l'utilisateur a saisi (année et bornes séparément) pour réafficher le formulaire tel
 * quel ; plageDe() en tire la plage à appliquer.
 */
export type CritereDate = { annee?: number; du?: Date; au?: Date }

export function plageDe(critere: CritereDate): PlageDates {
  const plageAnnee = critere.annee === undefined ? {} : plageDeLAnnee(critere.annee)
  return croiserPlages(plageAnnee, { du: critere.du, au: critere.au })
}

export function critereDateVide(critere: CritereDate): boolean {
  return critere.annee === undefined && critere.du === undefined && critere.au === undefined
}

export const CLES_TRI = [
  'nom',
  'grade',
  'statut',
  'etablissement',
  'retraite',
  'priseService',
  'naissance',
] as const
export type CleTri = (typeof CLES_TRI)[number]
export const ORDRES = ['asc', 'desc'] as const
export type Ordre = (typeof ORDRES)[number]

export type FiltresEnseignants = {
  /** Texte libre : chaque mot doit se retrouver dans nom, prénom, matricule, domaine ou lieu. */
  recherche: string
  statuts: StatutEnseignant[]
  grades: Grade[]
  sexe?: Sexe
  etablissementId?: string
  departementId?: string
  regionId?: string
  departementOrigineId?: string
  resident?: boolean
  collaboration?: boolean
  /** Vrai : occupe un poste de responsabilité ; faux : n'en occupe aucun. */
  responsabilite?: boolean
  classe?: number
  echelon?: number
  indiceMin?: number
  indiceMax?: number
  naissance: CritereDate
  priseService: CritereDate
  tri: CleTri
  ordre: Ordre
  page: number
}

export const TRI_PAR_DEFAUT: CleTri = 'nom'
export const ORDRE_PAR_DEFAUT: Ordre = 'asc'

export function filtresVides(): FiltresEnseignants {
  return {
    recherche: '',
    statuts: [],
    grades: [],
    naissance: {},
    priseService: {},
    tri: TRI_PAR_DEFAUT,
    ordre: ORDRE_PAR_DEFAUT,
    page: 1,
  }
}
