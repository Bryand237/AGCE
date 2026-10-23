import { refuserSiNonConnecte } from '@/lib/auth'
import { parametresDepuisUrl, lireFiltres } from '@/domain/enseignants/recherche/lireFiltres'
import { descriptionSelection, nomFichierSelection } from '@/lib/enseignants/descriptionSelection'
import { chargerSelection } from '@/lib/enseignants/selection'
import { genererPdf } from '@/lib/pdf/genererPdf'
import { construireHtmlFichierSelection } from '@/lib/pdf/liste/fichierEnseignants'

/**
 * PDF de la sélection affichée à l'écran : mêmes filtres (lus dans l'adresse), même tri, même
 * mise en page que la liste officielle. La page demandée est ignorée : on exporte tout.
 */
export async function GET(requete: Request) {
  const refus = await refuserSiNonConnecte()
  if (refus) return refus

  const filtres = lireFiltres(parametresDepuisUrl(new URL(requete.url).searchParams))
  const { lignes, puces, jour } = await chargerSelection(filtres)
  const pdf = await genererPdf(
    construireHtmlFichierSelection(lignes, descriptionSelection(puces, jour)),
    { paysage: true }
  )

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomFichierSelection(jour, 'pdf')}"`,
    },
  })
}
