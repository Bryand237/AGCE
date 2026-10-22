import { formaterDateCourte } from '../../dates/formaterDateCourte'
import { LIBELLES_GRADE } from '../grade'
import { LIBELLES_SEXE, LIBELLES_STATUT_ENSEIGNANT } from '../dossier'
import { versParametres } from './versParametres'
import type { CritereDate, CritereEcheance, Echeance, FiltresEnseignants } from './filtres'

/** Noms lisibles des éléments désignés par un identifiant dans l'adresse. */
export type ReferentielsFiltres = {
  etablissements: { id: string; nom: string; abreviation: string }[]
  departements: { id: string; nom: string; etablissementId: string }[]
  regions: { id: string; nom: string }[]
  departementsOrigine: { id: string; nom: string; regionId: string }[]
}

/**
 * Une puce résume un filtre actif (« Établissement : FALSH »). Supprimer la puce retire les
 * paramètres d'adresse qu'elle désigne, et eux seuls.
 */
export type Puce = { libelle: string; parametres: string[] }

const INTROUVABLE = 'introuvable'

/** « 1970 », « du 01/06/1970 au 30/06/1970 », « à partir du … », « jusqu'au … ». */
export function libelleCritereDate(critere: CritereDate): string {
  const parties: string[] = []
  if (critere.annee !== undefined) parties.push(String(critere.annee))
  if (critere.du && critere.au) {
    parties.push(`du ${formaterDateCourte(critere.du)} au ${formaterDateCourte(critere.au)}`)
  } else if (critere.du) {
    parties.push(`à partir du ${formaterDateCourte(critere.du)}`)
  } else if (critere.au) {
    parties.push(`jusqu'au ${formaterDateCourte(critere.au)}`)
  }
  return parties.join(' · ')
}

export const LIBELLES_ECHEANCE: Record<Echeance, string> = {
  passee: 'déjà passée',
  future: 'à venir',
}

/** « à venir », « déjà passée · 2024 », « à venir · du 01/06/2027 au 30/06/2027 »… */
export function libelleCritereEcheance(critere: CritereEcheance): string {
  const parties: string[] = []
  if (critere.echeance) parties.push(LIBELLES_ECHEANCE[critere.echeance])
  const dates = libelleCritereDate(critere)
  if (dates !== '') parties.push(dates)
  return parties.join(' · ')
}

const ouiNon = (valeur: boolean) => (valeur ? 'oui' : 'non')

export function decrirePuces(filtres: FiltresEnseignants, ref: ReferentielsFiltres): Puce[] {
  const puces: Puce[] = []
  const ajouter = (libelle: string, ...parametres: string[]) => puces.push({ libelle, parametres })

  if (filtres.recherche !== '') ajouter(`Recherche : « ${filtres.recherche} »`, 'recherche')
  if (filtres.statuts.length > 0) {
    ajouter(
      `Statut : ${filtres.statuts.map((s) => LIBELLES_STATUT_ENSEIGNANT[s]).join(', ')}`,
      'statut'
    )
  }
  if (filtres.grades.length > 0) {
    ajouter(`Grade : ${filtres.grades.map((g) => LIBELLES_GRADE[g] ?? g).join(', ')}`, 'grade')
  }
  if (filtres.sexe) ajouter(`Genre : ${LIBELLES_SEXE[filtres.sexe]}`, 'sexe')

  if (filtres.etablissementId) {
    const etablissement = ref.etablissements.find((e) => e.id === filtres.etablissementId)
    ajouter(`Établissement : ${etablissement?.abreviation ?? INTROUVABLE}`, 'etablissement')
  }
  if (filtres.departementId) {
    const departement = ref.departements.find((d) => d.id === filtres.departementId)
    ajouter(`Département : ${departement?.nom ?? INTROUVABLE}`, 'departement')
  }
  if (filtres.regionId) {
    const region = ref.regions.find((r) => r.id === filtres.regionId)
    ajouter(`Région d'origine : ${region?.nom ?? INTROUVABLE}`, 'region')
  }
  if (filtres.departementOrigineId) {
    const origine = ref.departementsOrigine.find((d) => d.id === filtres.departementOrigineId)
    ajouter(`Département d'origine : ${origine?.nom ?? INTROUVABLE}`, 'origine')
  }

  if (filtres.resident !== undefined) {
    ajouter(`Résident : ${ouiNon(filtres.resident)}`, 'resident')
  }
  if (filtres.collaboration !== undefined) {
    ajouter(`Contrat de collaboration : ${ouiNon(filtres.collaboration)}`, 'collaboration')
  }
  if (filtres.responsabilite !== undefined) {
    ajouter(`Poste de responsabilité : ${ouiNon(filtres.responsabilite)}`, 'responsabilite')
  }

  if (filtres.classe !== undefined) ajouter(`Classe : ${filtres.classe}`, 'classe')
  if (filtres.echelon !== undefined) ajouter(`Échelon : ${filtres.echelon}`, 'echelon')
  if (filtres.indiceMin !== undefined || filtres.indiceMax !== undefined) {
    const bornes =
      filtres.indiceMin !== undefined && filtres.indiceMax !== undefined
        ? `${filtres.indiceMin} à ${filtres.indiceMax}`
        : filtres.indiceMin !== undefined
          ? `au moins ${filtres.indiceMin}`
          : `au plus ${filtres.indiceMax}`
    ajouter(`Indice : ${bornes}`, 'indiceMin', 'indiceMax')
  }

  const critereDate = (nom: string, critere: CritereDate, prefixe: string) => {
    const libelle = libelleCritereDate(critere)
    if (libelle !== '') {
      ajouter(`${nom} : ${libelle}`, `${prefixe}Annee`, `${prefixe}Du`, `${prefixe}Au`)
    }
  }
  critereDate('Naissance', filtres.naissance, 'naissance')
  critereDate('Prise de service', filtres.priseService, 'priseService')

  const critereEcheance = (nom: string, critere: CritereEcheance, prefixe: string) => {
    const libelle = libelleCritereEcheance(critere)
    if (libelle !== '') {
      ajouter(
        `${nom} : ${libelle}`,
        `${prefixe}Echeance`,
        `${prefixe}Annee`,
        `${prefixe}Du`,
        `${prefixe}Au`
      )
    }
  }
  critereEcheance('Date de retraite', filtres.retraite, 'retraite')
  critereEcheance('Date d’avancement', filtres.avancement, 'avancement')

  return puces
}

/** Adresse de la liste sans le filtre de cette puce, de nouveau à la première page. */
export function adresseSansPuce(
  filtres: FiltresEnseignants,
  puce: Puce,
  chemin = '/enseignants'
): string {
  const parametres = versParametres({ ...filtres, page: 1 })
  for (const nom of puce.parametres) parametres.delete(nom)
  const texte = parametres.toString()
  return texte === '' ? chemin : `${chemin}?${texte}`
}
