import Link from 'next/link'
import type { FiltresEnseignants } from '@/domain/enseignants/recherche/filtres'
import {
  adresseRaccourci,
  raccourciActif,
  raccourcisDisponibles,
} from '@/domain/enseignants/recherche/raccourcis'

/**
 * Recherches toutes faites (retraite dépassée, retraite 2027, avancement échu…). Chacune est un
 * simple lien vers la liste filtrée : le même résultat que dans le panneau de filtres, qu'on
 * peut ensuite affiner. Le raccourci en cours est mis en évidence.
 */
export function RaccourcisListe({
  filtres,
  jourCourant,
}: {
  filtres: FiltresEnseignants
  jourCourant: Date
}) {
  const raccourcis = raccourcisDisponibles(jourCourant)
  return (
    <nav aria-label="Raccourcis de recherche" className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium">Raccourcis</span>
      {raccourcis.map((raccourci) => {
        const actif = raccourciActif(raccourci, filtres)
        return (
          <Link
            key={raccourci.id}
            href={adresseRaccourci(raccourci)}
            title={raccourci.description}
            aria-current={actif ? 'page' : undefined}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              actif
                ? 'bg-primary text-primary-foreground ring-primary'
                : 'bg-card text-foreground ring-border hover:bg-muted'
            }`}
          >
            {raccourci.libelle}
          </Link>
        )
      })}
    </nav>
  )
}
