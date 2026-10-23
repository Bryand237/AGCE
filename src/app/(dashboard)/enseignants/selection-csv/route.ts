import { refuserSiNonConnecte } from '@/lib/auth'
import { parametresDepuisUrl, lireFiltres } from '@/domain/enseignants/recherche/lireFiltres'
import { nomFichierSelection } from '@/lib/enseignants/descriptionSelection'
import { chargerSelection } from '@/lib/enseignants/selection'
import { construireCsvSelection } from '@/lib/export/csvEnseignants'

/**
 * Tableur (CSV) de la sélection affichée à l'écran : une ligne par enseignant, toute la fiche et
 * les dates calculées. S'ouvre directement dans Excel (UTF-8, séparateur « ; »).
 */
export async function GET(requete: Request) {
  const refus = await refuserSiNonConnecte()
  if (refus) return refus

  const filtres = lireFiltres(parametresDepuisUrl(new URL(requete.url).searchParams))
  const { lignes, jour } = await chargerSelection(filtres)

  return new Response(construireCsvSelection(lignes, jour), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomFichierSelection(jour, 'csv')}"`,
    },
  })
}
