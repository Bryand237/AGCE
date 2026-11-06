/**
 * Messages affichés au chargement de la page suivante, après une action qui se termine par
 * `redirect()` (créer, supprimer, valider…) : l'action ne peut pas renvoyer de texte à la page
 * qu'elle quitte, elle ajoute donc un CODE à l'adresse (`/enseignants?msg=enseignant_cree`) et
 * le texte est cherché ici.
 *
 * Seuls les codes de ce tableau produisent un message : l'adresse ne transporte jamais de texte
 * libre (un lien trafiqué ne peut pas faire afficher une phrase de son choix).
 *
 * Fichier partagé entre les actions serveur (qui écrivent le code) et le navigateur (qui le lit) :
 * rien d'autre que des données et deux fonctions pures.
 */
export type TonMessage = 'succes' | 'info' | 'avertissement' | 'erreur'

export type MessageFlash = {
  ton: TonMessage
  message: string
  /** Reste affiché jusqu'à la fermeture. Par défaut : seuls succès et infos disparaissent seuls. */
  persistant?: boolean
}

export const PARAMETRE_MESSAGE = 'msg'

export const MESSAGES_FLASH = {
  enseignant_cree: { ton: 'succes', message: 'Enseignant ajouté.' },
  enseignant_modifie: { ton: 'succes', message: 'Modifications enregistrées.' },
  photo_enseignant_echec: {
    ton: 'avertissement',
    message:
      'Les informations sont enregistrées, mais la photo n’a pas pu l’être. Ouvrez « Modifier » pour la renvoyer.',
  },
  etablissement_cree: { ton: 'succes', message: 'Établissement ajouté.' },
  etablissement_modifie: { ton: 'succes', message: 'Modifications enregistrées.' },
  etablissement_supprime: { ton: 'succes', message: 'Établissement supprimé.' },
  image_etablissement_echec: {
    ton: 'avertissement',
    message:
      'Les informations sont enregistrées, mais l’image n’a pas pu l’être. Ouvrez « Modifier » pour la renvoyer.',
  },
  absence_creee: { ton: 'succes', message: 'Absence enregistrée.' },
  absence_supprimee: { ton: 'succes', message: 'Absence supprimée.' },
  rapport_cree: { ton: 'succes', message: 'Rapport créé.' },
  rapport_supprime: { ton: 'succes', message: 'Rapport supprimé.' },
  rapport_valide: {
    ton: 'succes',
    message: 'Rapport validé : les échelons des enseignants retenus sont à jour.',
  },
} as const satisfies Record<string, MessageFlash>

export type CodeMessage = keyof typeof MESSAGES_FLASH

/** `/enseignants` + `enseignant_cree` → `/enseignants?msg=enseignant_cree`. */
export function avecMessage(chemin: string, code: CodeMessage): string {
  return `${chemin}${chemin.includes('?') ? '&' : '?'}${PARAMETRE_MESSAGE}=${code}`
}

/** Le message d'un code lu dans l'adresse ; `undefined` pour tout code inconnu. */
export function lireMessage(code: string | null | undefined): MessageFlash | undefined {
  if (!code || !Object.prototype.hasOwnProperty.call(MESSAGES_FLASH, code)) return undefined
  return MESSAGES_FLASH[code as CodeMessage]
}
