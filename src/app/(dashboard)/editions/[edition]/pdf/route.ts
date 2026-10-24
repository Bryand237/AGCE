import { refuserSiNonConnecte } from '@/lib/auth'
import { lireDemandeEdition, nomFichierEdition } from '@/domain/editions/editions'
import { chargerEdition } from '@/lib/editions/chargerEdition'
import { construireHtmlEdition } from '@/lib/editions/documentEdition'
import { genererPdf } from '@/lib/pdf/genererPdf'

/**
 * PDF d'une liste officielle (« Éditions »), un établissement par page. La liste est celle de
 * l'adresse : /editions/retraite/pdf?annee=2027. Une liste inconnue répond 404, un paramètre
 * invalide 400 avec le motif en clair : on n'imprime jamais une autre liste que celle demandée.
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
  const pdf = await genererPdf(construireHtmlEdition(demande, lignes, jour), { paysage: true })

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomFichierEdition(demande, jour, 'pdf')}"`,
    },
  })
}
