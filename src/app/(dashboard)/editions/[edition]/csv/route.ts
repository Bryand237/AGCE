import { refuserSiNonConnecte } from '@/lib/auth'
import { lireDemandeEdition, nomFichierEdition } from '@/domain/editions/editions'
import { chargerEdition } from '@/lib/editions/chargerEdition'
import { construireCsvEdition } from '@/lib/editions/csvEdition'

/**
 * Tableur (CSV) d'une liste officielle : les mêmes lignes que le PDF, toute l'université dans un
 * seul fichier avec une colonne « Établissement ». S'ouvre directement dans Excel (UTF-8,
 * séparateur « ; »). Mêmes refus que le PDF pour une liste inconnue ou un paramètre invalide.
 */
export async function GET(requete: Request, { params }: { params: Promise<{ edition: string }> }) {
  const refus = await refuserSiNonConnecte()
  if (refus) return refus

  const { edition } = await params
  const lecture = lireDemandeEdition(edition, new URL(requete.url).searchParams)
  if ('erreur' in lecture) {
    return new Response(lecture.erreur.message, {
      status: lecture.erreur.code === 'EDITION_INCONNUE' ? 404 : 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const { demande } = lecture
  const { lignes, jour } = await chargerEdition(demande)

  return new Response(construireCsvEdition(demande, lignes), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomFichierEdition(demande, jour, 'csv')}"`,
    },
  })
}
