import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Le logo n'est pas versionné (reference-docs/ est exclu de Git) : il peut donc
// manquer sur une nouvelle installation, un nouveau clone ou dans l'image Docker.
const CHEMIN_LOGO = ['reference-docs', 'logo.jpeg']

/**
 * Renvoie le logo sous forme d'URI de données prête à mettre dans un <img src>,
 * ou null s'il est absent ou illisible. Le document doit alors être produit sans
 * logo plutôt qu'en erreur : le rapport officiel reste téléchargeable.
 */
export function lireLogo(racine: string = process.cwd()): string | null {
  try {
    const contenu = readFileSync(join(racine, ...CHEMIN_LOGO))
    if (contenu.length === 0) throw new Error('fichier vide')
    return `data:image/jpeg;base64,${contenu.toString('base64')}`
  } catch {
    console.warn(
      `Logo introuvable ou illisible (${CHEMIN_LOGO.join('/')}) : le document est produit sans logo.`
    )
    return null
  }
}
