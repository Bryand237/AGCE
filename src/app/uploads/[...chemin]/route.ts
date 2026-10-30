import { lireImage } from '@/lib/televersement'

/**
 * Sert les photos et images téléversées (`/uploads/<dossier>/<fichier>`).
 *
 * Volontairement SANS contrôle de connexion, comme `public/uploads/` avant elle : l'optimiseur
 * d'images de Next.js relit chaque photo par une requête interne qui ne porte pas le cookie de
 * connexion (voir `src/proxy.ts` et le README, « Contrôle d'accès »). Le nom d'un fichier est un
 * identifiant aléatoire suivi d'un horodatage.
 *
 * Ne sert que des images (JPEG, PNG, WebP reconnues à leurs octets) des deux dossiers connus,
 * avec leur vrai type et `nosniff` : un autre contenu, même enregistré par erreur sous ce nom,
 * n'est jamais renvoyé.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chemin: string[] }> }
) {
  const { chemin } = await params
  const [dossier, nom] = chemin
  const image = chemin.length === 2 && dossier && nom ? await lireImage(dossier, nom) : null
  if (!image) return new Response('Image introuvable', { status: 404 })

  return new Response(new Uint8Array(image.octets), {
    headers: {
      'Content-Type': image.type,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
