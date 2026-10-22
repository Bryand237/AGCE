import { analyserDateIso } from '../../dates/jourCivil'
import { GRADES, SEXES, STATUTS_ENSEIGNANT } from '../dossier'
import { CLES_TRI, ORDRES, filtresVides } from './filtres'
import type { CritereDate, FiltresEnseignants } from './filtres'

/** Forme des paramètres d'adresse que Next.js transmet à une page (searchParams). */
export type ParametresUrl = Record<string, string | string[] | undefined>

export const ANNEE_MIN = 1900
export const ANNEE_MAX = 2200
const LONGUEUR_MAX_RECHERCHE = 100

function valeursBrutes(parametre: string | string[] | undefined): string[] {
  const liste = Array.isArray(parametre) ? parametre : parametre === undefined ? [] : [parametre]
  // « statut=ACTIF,RETRAITE » est accepté comme « statut=ACTIF&statut=RETRAITE ».
  return liste.flatMap((v) => v.split(',')).map((v) => v.trim())
}

function premiereValeur(parametre: string | string[] | undefined): string | undefined {
  const brute = Array.isArray(parametre) ? parametre[0] : parametre
  const texte = brute?.trim()
  return texte === undefined || texte === '' ? undefined : texte
}

function entier(
  parametre: string | string[] | undefined,
  min: number,
  max: number
): number | undefined {
  const texte = premiereValeur(parametre)
  if (texte === undefined || !/^\d{1,6}$/.test(texte)) return undefined
  const valeur = Number(texte)
  return valeur >= min && valeur <= max ? valeur : undefined
}

function ouiNon(parametre: string | string[] | undefined): boolean | undefined {
  const texte = premiereValeur(parametre)?.toLowerCase()
  if (texte === 'oui') return true
  if (texte === 'non') return false
  return undefined
}

function enumeration<T extends string>(
  parametre: string | string[] | undefined,
  valeursAdmises: readonly T[]
): T | undefined {
  const texte = premiereValeur(parametre)
  return valeursAdmises.find((v) => v === texte)
}

function listeEnumeree<T extends string>(
  parametre: string | string[] | undefined,
  valeursAdmises: readonly T[]
): T[] {
  const lues = valeursBrutes(parametre)
  // Dans l'ordre du référentiel et sans doublon : deux adresses équivalentes donnent le même filtre.
  return valeursAdmises.filter((v) => lues.includes(v))
}

/** Identifiant d'une ligne de la base : lettres, chiffres, tirets — sinon ignoré. */
function identifiant(parametre: string | string[] | undefined): string | undefined {
  const texte = premiereValeur(parametre)
  return texte !== undefined && /^[A-Za-z0-9_-]{1,64}$/.test(texte) ? texte : undefined
}

function texteLibre(parametre: string | string[] | undefined): string {
  const texte = premiereValeur(parametre) ?? ''
  return texte.replace(/\s+/g, ' ').slice(0, LONGUEUR_MAX_RECHERCHE).trim()
}

function date(parametre: string | string[] | undefined): Date | undefined {
  const texte = premiereValeur(parametre)
  if (texte === undefined) return undefined
  const lue = analyserDateIso(texte)
  if (!lue) return undefined
  const annee = lue.getUTCFullYear()
  return annee >= ANNEE_MIN && annee <= ANNEE_MAX ? lue : undefined
}

/** Lit « <prefixe>Annee », « <prefixe>Du » et « <prefixe>Au ». */
function critereDate(parametres: ParametresUrl, prefixe: string): CritereDate {
  const critere: CritereDate = {}
  const annee = entier(parametres[`${prefixe}Annee`], ANNEE_MIN, ANNEE_MAX)
  const du = date(parametres[`${prefixe}Du`])
  const au = date(parametres[`${prefixe}Au`])
  if (annee !== undefined) critere.annee = annee
  if (du) critere.du = du
  if (au) critere.au = au
  return critere
}

/**
 * Lit les filtres d'une adresse. Ne lève jamais d'erreur : une valeur absente, mal formée,
 * hors limites ou inconnue est simplement ignorée (une adresse enregistrée ou tapée à la main
 * ne doit jamais faire tomber la page). Le numéro de page n'est pas borné ici : il l'est par
 * paginer(), qui connaît le nombre de pages.
 */
export function lireFiltres(parametres: ParametresUrl): FiltresEnseignants {
  const filtres = filtresVides()

  filtres.recherche = texteLibre(parametres.recherche)
  filtres.statuts = listeEnumeree(parametres.statut, STATUTS_ENSEIGNANT)
  filtres.grades = listeEnumeree(parametres.grade, GRADES)

  const sexe = enumeration(parametres.sexe, SEXES)
  if (sexe) filtres.sexe = sexe

  const etablissementId = identifiant(parametres.etablissement)
  if (etablissementId) filtres.etablissementId = etablissementId
  const departementId = identifiant(parametres.departement)
  if (departementId) filtres.departementId = departementId
  const regionId = identifiant(parametres.region)
  if (regionId) filtres.regionId = regionId
  const departementOrigineId = identifiant(parametres.origine)
  if (departementOrigineId) filtres.departementOrigineId = departementOrigineId

  const resident = ouiNon(parametres.resident)
  if (resident !== undefined) filtres.resident = resident
  const collaboration = ouiNon(parametres.collaboration)
  if (collaboration !== undefined) filtres.collaboration = collaboration
  const responsabilite = ouiNon(parametres.responsabilite)
  if (responsabilite !== undefined) filtres.responsabilite = responsabilite

  const classe = entier(parametres.classe, 1, 9)
  if (classe !== undefined) filtres.classe = classe
  const echelon = entier(parametres.echelon, 1, 9)
  if (echelon !== undefined) filtres.echelon = echelon
  const indiceMin = entier(parametres.indiceMin, 0, 9999)
  if (indiceMin !== undefined) filtres.indiceMin = indiceMin
  const indiceMax = entier(parametres.indiceMax, 0, 9999)
  if (indiceMax !== undefined) filtres.indiceMax = indiceMax

  filtres.naissance = critereDate(parametres, 'naissance')
  filtres.priseService = critereDate(parametres, 'priseService')

  // « trier » : nom de paramètre déjà employé par l'ancienne liste (adresses enregistrées).
  filtres.tri = enumeration(parametres.trier, CLES_TRI) ?? filtres.tri
  filtres.ordre = enumeration(parametres.ordre, ORDRES) ?? filtres.ordre

  filtres.page = entier(parametres.page, 1, 1_000_000) ?? 1
  return filtres
}

/** Convertit des paramètres d'adresse (URLSearchParams) dans la forme attendue par lireFiltres. */
export function parametresDepuisUrl(recherche: URLSearchParams): ParametresUrl {
  const resultat: ParametresUrl = {}
  for (const cle of new Set(recherche.keys())) {
    const valeurs = recherche.getAll(cle)
    resultat[cle] = valeurs.length === 1 ? valeurs[0] : valeurs
  }
  return resultat
}
