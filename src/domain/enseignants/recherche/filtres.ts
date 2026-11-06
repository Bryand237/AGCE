import { croiserPlages, plageDeLAnnee } from '../../dates/plage'
import type { PlageDates } from '../../dates/plage'
import type { EtatAbsence } from '../../absences/etatAbsence'
import type { Grade, Sexe, StatutEnseignant, TypeAbsence } from '../dossier'

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

/**
 * Critère sur une date calculée (retraite, prochain avancement) : le critère de date habituel
 * (année, plage), plus une échéance relative à AUJOURD'HUI — « déjà passée » ou « à venir ».
 * Une date qui n'existe pas (transféré, dernier palier de la grille…) ne correspond à aucun
 * critère renseigné.
 */
export const ECHEANCES = ['passee', 'future'] as const
export type Echeance = (typeof ECHEANCES)[number]
export type CritereEcheance = CritereDate & { echeance?: Echeance }

export function critereEcheanceVide(critere: CritereEcheance): boolean {
  return critereDateVide(critere) && critere.echeance === undefined
}

/**
 * Critère sur les absences d'un enseignant. Les critères se rapportent à UNE MÊME absence :
 * « Mission » et « en cours » cherchent une absence qui est à la fois une mission et en cours,
 * pas une mission d'un côté et un autre congé en cours de l'autre.
 *
 * `presence` choisit le sens : vrai (ou absent, dès qu'un critère est renseigné) : l'enseignant a
 * au moins une absence qui répond à tout ; faux : il n'en a aucune qui y réponde. Sans autre
 * critère, vrai = « a déjà eu une absence », faux = « n'en a jamais eu ».
 *
 * - `debut` / `fin` : année ou période où tombe le début / la fin PRÉVUE de l'absence ;
 * - `pendant` : l'absence recoupe cette année ou cette période (au moins un jour en commun),
 *   le retour réel remplaçant la fin prévue quand il est enregistré.
 */
export type CritereAbsence = {
  presence?: boolean
  etats: EtatAbsence[]
  types: TypeAbsence[]
  debut: CritereDate
  fin: CritereDate
  pendant: CritereDate
}

export function critereAbsenceVide(critere: CritereAbsence): boolean {
  return (
    critere.presence === undefined &&
    critere.etats.length === 0 &&
    critere.types.length === 0 &&
    critereDateVide(critere.debut) &&
    critereDateVide(critere.fin) &&
    critereDateVide(critere.pendant)
  )
}

export function critereAbsenceNeutre(): CritereAbsence {
  return { etats: [], types: [], debut: {}, fin: {}, pendant: {} }
}

export const CLES_TRI = [
  'nom',
  'grade',
  'statut',
  'etablissement',
  'retraite',
  'avancement',
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
  /** Date de départ à la retraite (réelle pour un retraité, théorique pour un actif). */
  retraite: CritereEcheance
  /** Date à laquelle l'enseignant actif devient éligible à l'échelon suivant. */
  avancement: CritereEcheance
  /** Absences : missions, congés… (état, type, début, fin, période). */
  absence: CritereAbsence
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
    retraite: {},
    avancement: {},
    absence: critereAbsenceNeutre(),
    tri: TRI_PAR_DEFAUT,
    ordre: ORDRE_PAR_DEFAUT,
    page: 1,
  }
}
