/**
 * Règles des images téléversées (photos des enseignants, images des établissements).
 *
 * Avant : le type et l'extension venaient du navigateur (`photo.type.split('/')[1]`), la taille
 * n'était pas limitée et le nom était toujours `<id>.<extension>`. N'importe quel fichier
 * (« .html », « .svg »…) était enregistré sous un nom choisi par l'expéditeur, et une photo
 * remplacée gardait la même adresse, donc l'ancienne restait affichée par le navigateur.
 *
 * Ici, le type est lu dans les PREMIERS OCTETS du fichier (ce qu'il est vraiment), jamais dans
 * ce que le navigateur déclare, et l'extension en est déduite.
 */

export type TypeImage = 'image/jpeg' | 'image/png' | 'image/webp'

export const DOSSIERS_IMAGES = ['enseignants', 'etablissements'] as const
export type DossierImages = (typeof DOSSIERS_IMAGES)[number]

/** 4 Mo : assez pour une photo de téléphone, sous la limite de 5 Mo des actions serveur. */
export const TAILLE_MAX_IMAGE_OCTETS = 4 * 1024 * 1024

const EXTENSIONS: Record<TypeImage, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const commencePar = (octets: Uint8Array, signature: number[], decalage = 0) =>
  signature.every((valeur, i) => octets[decalage + i] === valeur)

/** Le vrai type d'une image d'après ses premiers octets, ou `null` si ce n'en est pas une acceptée. */
export function detecterTypeImage(octets: Uint8Array): TypeImage | null {
  if (commencePar(octets, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (commencePar(octets, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  // WebP : « RIFF », 4 octets de taille, puis « WEBP ».
  if (
    commencePar(octets, [0x52, 0x49, 0x46, 0x46]) &&
    commencePar(octets, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp'
  }
  return null
}

export function extensionDuType(type: TypeImage): string {
  return EXTENSIONS[type]
}

/** Le message à afficher quand l'image est refusée, ou `null` si elle est acceptable. */
export function erreurImage(octets: Uint8Array): string | null {
  if (octets.length === 0) return "Le fichier de l'image est vide."
  if (octets.length > TAILLE_MAX_IMAGE_OCTETS) {
    return `L'image est trop lourde (${TAILLE_MAX_IMAGE_OCTETS / (1024 * 1024)} Mo au plus).`
  }
  if (detecterTypeImage(octets) === null) {
    return "Format d'image non accepté : utilisez une image JPEG, PNG ou WebP."
  }
  return null
}

const IDENTIFIANT = /^[A-Za-z0-9-]{1,64}$/

/**
 * Nom unique d'un fichier : `<identifiant>-<AAAAMMJJHHMMSSmmm>.<extension>`. Un nom nouveau à
 * chaque envoi : une photo remplacée change d'adresse, et aucun navigateur ni cache ne garde
 * l'ancienne.
 */
export function nomFichierImage(proprietaireId: string, type: TypeImage, maintenant: Date): string {
  if (!IDENTIFIANT.test(proprietaireId)) {
    throw new Error("Identifiant invalide pour le nom d'un fichier image.")
  }
  const horodatage = maintenant.toISOString().replace(/[-:T.Z]/g, '') // 2026-10-30T08:09:10.123Z → 20261030080910123
  return `${proprietaireId}-${horodatage}.${EXTENSIONS[type]}`
}

const NOM_FICHIER = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * Lit une adresse `/uploads/<dossier>/<fichier>` enregistrée en base. Refuse tout ce qui pourrait
 * sortir du dossier des images (`..`, séparateurs, dossier inconnu) : l'adresse sert ensuite à
 * choisir un fichier à lire ou à SUPPRIMER sur le disque.
 */
export function lireAdresseImage(adresse: string | null | undefined): {
  dossier: DossierImages
  nom: string
} | null {
  const morceaux = adresse?.split('/')
  if (!morceaux || morceaux.length !== 4 || morceaux[0] !== '' || morceaux[1] !== 'uploads') {
    return null
  }
  const [, , dossier, nom] = morceaux
  return verifierEmplacement(dossier, nom)
}

/** Valide un couple (dossier, nom) venu d'une adresse web ou de la base. */
export function verifierEmplacement(
  dossier: string | undefined,
  nom: string | undefined
): { dossier: DossierImages; nom: string } | null {
  if (!dossier || !nom) return null
  if (!(DOSSIERS_IMAGES as readonly string[]).includes(dossier)) return null
  if (!NOM_FICHIER.test(nom) || nom.includes('..')) return null
  return { dossier: dossier as DossierImages, nom }
}
