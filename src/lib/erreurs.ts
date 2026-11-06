/**
 * Traduction des erreurs de la base de données en messages honnêtes pour l'utilisateur.
 *
 * Avant ce fichier, plusieurs actions répondaient « Ce matricule existe déjà. » à TOUTE
 * exception : une base arrêtée ou un enseignant supprimé entre-temps passaient pour un
 * doublon, et l'utilisateur cherchait un doublon qui n'existait pas. Ici, seul le code
 * d'erreur de Prisma décide de ce qui est annoncé.
 *
 * Usage, dans une action, autour des seuls appels à la base (jamais autour de redirect(),
 * qui interrompt l'exécution en levant une exception) :
 *
 *   try {
 *     await prisma.enseignant.create({ data })
 *   } catch (erreur) {
 *     return { message: messageErreur(erreur, 'creerEnseignant', { unicite: 'Ce matricule existe déjà.' }) }
 *   }
 *
 * Les erreurs sont reconnues par leur forme (code, meta), sans `instanceof` : le fichier
 * ne dépend pas du client Prisma généré et se teste sans base.
 */

export const MESSAGE_ERREUR_TECHNIQUE =
  "Une erreur technique est survenue : l'opération n'a pas abouti. Réessayez ; si le problème persiste, contactez le responsable technique."

const MESSAGE_UNICITE_PAR_DEFAUT = 'Un enregistrement identique existe déjà.'
const MESSAGE_INTROUVABLE_PAR_DEFAUT =
  "Cet élément n'existe plus (il a peut-être été supprimé). Rechargez la page."
const MESSAGE_REFERENCE_PAR_DEFAUT =
  "Opération impossible : d'autres éléments en dépendent ou l'élément visé n'existe plus. Rechargez la page."
const MESSAGE_BASE_INJOIGNABLE =
  "La base de données est injoignable. Vérifiez qu'elle est démarrée, puis réessayez."
const MESSAGE_DELAI_PAR_DEFAUT =
  "L'opération a pris trop de temps ; rien n'a été modifié. Réessayez."

export type NatureErreur =
  | 'unicite'
  | 'introuvable'
  | 'reference'
  | 'base_injoignable'
  | 'delai'
  | 'inconnue'

export type ErreurAnalysee = {
  nature: NatureErreur
  /** Champs en cause pour une violation d'unicité (vide quand Prisma ne les indique pas). */
  champs: string[]
}

export type TextesErreur = {
  /**
   * Violation d'unicité (P2002). Un texte unique, ou un texte par champ en cause
   * (`{ nom: '…', abreviation: '…', '*': 'texte si le champ est inconnu' }`).
   */
  unicite?: string | Record<string, string>
  /** Enregistrement introuvable (P2025) : supprimé entre l'affichage et l'envoi. */
  introuvable?: string
  /** Contrainte de clé étrangère (P2003). */
  reference?: string
  /** Transaction trop longue (P2028). */
  delai?: string
}

// Codes de Prisma pour une base qui ne répond pas : P1001 injoignable, P1002 délai dépassé,
// P1008 délai d'opération, P1017 connexion fermée, P2024 plus de connexion disponible.
const CODES_BASE_INJOIGNABLE = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024'])
const CODES_RESEAU = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'])

type Objet = Record<string, unknown>
const estObjet = (valeur: unknown): valeur is Objet => typeof valeur === 'object' && valeur !== null

/** Les erreurs de navigation de Next.js (redirect, notFound…) ne sont jamais des échecs. */
function estErreurDeNavigation(erreur: unknown): boolean {
  return estObjet(erreur) && typeof erreur.digest === 'string' && erreur.digest.startsWith('NEXT_')
}

function enTableauDeTextes(valeur: unknown): string[] {
  if (typeof valeur === 'string') return [valeur]
  if (Array.isArray(valeur)) return valeur.filter((v): v is string => typeof v === 'string')
  return []
}

/**
 * Champs d'une violation d'unicité, selon l'endroit où cette version de Prisma les place.
 *
 * Prisma 7 avec @prisma/adapter-pg (lu dans le code publié de @prisma/client-engine-runtime
 * 7.4.0 et de @prisma/adapter-pg 7.4.0) : l'erreur porte le code P2002 et
 * `meta = { driverAdapterError }` — il n'y a plus de `meta.target`. Les colonnes se trouvent
 * dans `meta.driverAdapterError.cause.constraint.fields`, extraites du détail de PostgreSQL
 * (« Key (matricule)=(…) already exists »). Si ce détail n'est pas en anglais, ou n'a pas la
 * forme attendue, `fields` est absent : la liste est alors vide et c'est le texte générique
 * (clé « * ») qui s'applique. `meta.target` (anciens moteurs) et le message de l'erreur sont
 * lus en dernier recours.
 */
function champsEnCause(erreur: Objet): string[] {
  const meta = estObjet(erreur.meta) ? erreur.meta : {}
  const adaptateur = estObjet(meta.driverAdapterError) ? meta.driverAdapterError : {}
  const cause = estObjet(adaptateur.cause) ? adaptateur.cause : {}
  const contrainte = estObjet(cause.constraint) ? cause.constraint : {}

  const champs = [
    ...enTableauDeTextes(meta.target),
    ...enTableauDeTextes(contrainte.fields),
    ...enTableauDeTextes(contrainte.index),
  ]
  if (champs.length > 0) return champs

  // Dernier recours : « Unique constraint failed on the fields: (`matricule`) ».
  const entreParentheses = /fields?:\s*\(([^)]*)\)/i.exec(String(erreur.message ?? ''))
  if (!entreParentheses?.[1]) return []
  return [...entreParentheses[1].matchAll(/`([^`]+)`/g)].map((m) => m[1] as string)
}

function codeReseauDansLaChaine(erreur: unknown): boolean {
  let courante: unknown = erreur
  for (let profondeur = 0; profondeur < 5 && estObjet(courante); profondeur++) {
    if (typeof courante.code === 'string' && CODES_RESEAU.has(courante.code)) return true
    courante = courante.cause
  }
  return false
}

export function analyserErreur(erreur: unknown): ErreurAnalysee {
  const code = estObjet(erreur) && typeof erreur.code === 'string' ? erreur.code : undefined

  if (code === 'P2002') return { nature: 'unicite', champs: champsEnCause(erreur as Objet) }
  if (code === 'P2025') return { nature: 'introuvable', champs: [] }
  if (code === 'P2003') return { nature: 'reference', champs: [] }
  if (code === 'P2028') return { nature: 'delai', champs: [] }
  if ((code && CODES_BASE_INJOIGNABLE.has(code)) || codeReseauDansLaChaine(erreur)) {
    return { nature: 'base_injoignable', champs: [] }
  }
  return { nature: 'inconnue', champs: [] }
}

function texteDUnicite(texte: TextesErreur['unicite'], champs: string[]): string {
  if (typeof texte === 'string') return texte
  if (!texte) return MESSAGE_UNICITE_PAR_DEFAUT

  const enMinuscules = champs.map((c) => c.toLowerCase())
  for (const [champ, message] of Object.entries(texte)) {
    if (champ === '*') continue
    if (enMinuscules.some((c) => c.includes(champ.toLowerCase()))) return message
  }
  return texte['*'] ?? MESSAGE_UNICITE_PAR_DEFAUT
}

/**
 * Message à afficher pour une exception attrapée autour d'un appel à la base.
 * Les cas attendus (doublon, élément disparu) ne sont pas journalisés ; tous les autres le
 * sont, avec le nom de l'action, pour que le responsable technique retrouve la cause.
 * Une erreur de navigation de Next.js est relancée telle quelle.
 */
export function messageErreur(
  erreur: unknown,
  contexte: string,
  textes: TextesErreur = {}
): string {
  if (estErreurDeNavigation(erreur)) throw erreur

  const { nature, champs } = analyserErreur(erreur)
  switch (nature) {
    case 'unicite':
      return texteDUnicite(textes.unicite, champs)
    case 'introuvable':
      return textes.introuvable ?? MESSAGE_INTROUVABLE_PAR_DEFAUT
    case 'reference':
      console.error(`${contexte} : contrainte de référence`, erreur)
      return textes.reference ?? MESSAGE_REFERENCE_PAR_DEFAUT
    case 'delai':
      console.error(`${contexte} : transaction trop longue`, erreur)
      return textes.delai ?? MESSAGE_DELAI_PAR_DEFAUT
    case 'base_injoignable':
      console.error(`${contexte} : base de données injoignable`, erreur)
      return MESSAGE_BASE_INJOIGNABLE
    default:
      console.error(`${contexte} : erreur inattendue`, erreur)
      return MESSAGE_ERREUR_TECHNIQUE
  }
}
