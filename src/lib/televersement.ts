import fs from 'fs/promises'
import path from 'path'
import {
  detecterTypeImage,
  erreurImage,
  lireAdresseImage,
  nomFichierImage,
  verifierEmplacement,
  type DossierImages,
  type TypeImage,
} from '@/domain/televersement/imageTeleversee'

/**
 * Stockage des images téléversées : le seul endroit où l'application lit, écrit et supprime
 * des fichiers d'images (photos des enseignants, images des établissements).
 *
 * Où sont les fichiers :
 *   - PAR DÉFAUT `public/uploads/<dossier>/`, là où ils étaient déjà : une installation existante
 *     (npm run dev ou next start, base dans Docker) ne déplace RIEN, ses photos restent où elles
 *     sont et les sauvegardes qui copient `public/uploads` les trouvent toujours ;
 *   - avec la variable UPLOADS_DIR, ce dossier-là. L'image Docker l'utilise (`/app/data/uploads`,
 *     un volume appartenant à l'utilisateur de l'application) : dans l'image, `public/` est figé
 *     à la construction et n'est pas inscriptible. Les anciens fichiers de `public/uploads`
 *     (ceux du dépôt, par exemple) y restent lus.
 *
 * L'adresse enregistrée en base est la même dans tous les cas : `/uploads/<dossier>/<fichier>`,
 * servie par `src/app/uploads/[...chemin]/route.ts` quand Next.js ne la sert pas lui-même
 * (fichier ajouté à `public/` après le démarrage, ou dossier hors de `public/`).
 */

export function racineTeleversements(): string {
  return process.env.UPLOADS_DIR || racineHeritee()
}

function racineHeritee(): string {
  return path.join(process.cwd(), 'public', 'uploads')
}

/** Les dossiers où chercher un fichier : le principal d'abord, puis l'ancien s'il en diffère. */
function racinesDeLecture(): string[] {
  return [...new Set([racineTeleversements(), racineHeritee()])]
}

export type ImageLue = { octets: Buffer; type: TypeImage }

/**
 * Lit et contrôle le fichier d'un champ de formulaire. `null` : aucun fichier choisi ;
 * `{ erreur }` : fichier refusé (vide, trop lourd, pas une image JPEG, PNG ou WebP).
 */
export async function lireImageTeleversee(
  valeur: unknown
): Promise<ImageLue | { erreur: string } | null> {
  const fichier = valeur as { size?: number; arrayBuffer?: () => Promise<ArrayBuffer> } | null
  if (!fichier || typeof fichier.arrayBuffer !== 'function' || !fichier.size) return null

  const octets = Buffer.from(await fichier.arrayBuffer())
  const erreur = erreurImage(octets)
  if (erreur) return { erreur }
  return { octets, type: detecterTypeImage(octets)! }
}

/** Enregistre l'image sous un nom neuf et renvoie l'adresse à mettre en base. */
export async function enregistrerImage(
  dossier: DossierImages,
  proprietaireId: string,
  image: ImageLue
): Promise<string> {
  const nom = nomFichierImage(proprietaireId, image.type, new Date())
  const dossierCible = path.join(racineTeleversements(), dossier)
  await fs.mkdir(dossierCible, { recursive: true })
  // « wx » : ne jamais écraser un fichier existant.
  await fs.writeFile(path.join(dossierCible, nom), image.octets, { flag: 'wx' })
  return `/uploads/${dossier}/${nom}`
}

/**
 * Supprime le fichier d'une adresse enregistrée, où qu'il soit (nouveau ou ancien emplacement).
 * Sans effet si l'adresse n'est pas une adresse d'image valide ou si le fichier n'existe plus :
 * un fichier déjà absent n'est pas une erreur.
 */
export async function supprimerImage(adresse: string | null | undefined): Promise<void> {
  const emplacement = lireAdresseImage(adresse)
  if (!emplacement) return
  for (const racine of racinesDeLecture()) {
    await fs.unlink(path.join(racine, emplacement.dossier, emplacement.nom)).catch(() => {})
  }
}

/**
 * Lit une image à servir, ou `null` si elle n'existe pas ou n'est pas une image acceptée.
 * Le type vient des octets du fichier, jamais de son nom : les anciens fichiers ont des
 * extensions fantaisistes (`.octet-stream`).
 */
export async function lireImage(dossier: string, nom: string): Promise<ImageLue | null> {
  const emplacement = verifierEmplacement(dossier, nom)
  if (!emplacement) return null
  for (const racine of racinesDeLecture()) {
    try {
      const octets = await fs.readFile(path.join(racine, emplacement.dossier, emplacement.nom))
      const type = detecterTypeImage(octets)
      if (type) return { octets, type }
    } catch {
      // absent à cet emplacement : on essaie l'autre
    }
  }
  return null
}
