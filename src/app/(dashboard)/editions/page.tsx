import { FileDown, FileSpreadsheet, UserX } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { aujourdhui, anneeDe } from '@/domain/dates/jourCivil'
import {
  ANNEE_MAX,
  ANNEE_MIN,
  DEFINITIONS_EDITION,
  lireAnneeEdition,
  selectionnerEdition,
  titreEdition,
} from '@/domain/editions/editions'
import { regrouperParEtablissement } from '@/domain/editions/parEtablissement'
import type { ParametresUrl } from '@/domain/enseignants/recherche/lireFiltres'
import { chargerDossiers, chargerGrille } from '@/lib/enseignants/chargerDossiers'
import { CarteEdition } from './carte-edition'

const premier = (valeur: string | string[] | undefined) =>
  Array.isArray(valeur) ? valeur[0] : valeur

const BOUTON =
  'border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium shadow-sm'

export default async function PageEditions({
  searchParams,
}: {
  searchParams: Promise<ParametresUrl>
}) {
  const parametres = await searchParams
  const jourCourant = aujourdhui()
  // Sur cette page, une année absente ou invalide revient à l'année en cours : ce n'est qu'une
  // valeur de départ du formulaire. Les téléchargements, eux, refusent une année invalide.
  const annee = lireAnneeEdition(premier(parametres.annee)) ?? anneeDe(jourCourant)

  const [dossiers, grille] = await Promise.all([chargerDossiers(), chargerGrille()])
  // Même sélection que les téléchargements : le décompte affiché est celui du PDF.
  const demande = { cle: 'retraite', annee } as const
  const retraites = selectionnerEdition(demande, dossiers, grille, jourCourant)
  const parEtablissement = regrouperParEtablissement(retraites)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Éditions"
        description="Listes officielles classées par établissement, à imprimer (PDF) ou à ouvrir dans Excel"
      />

      <CarteEdition
        icone={UserX}
        titre={DEFINITIONS_EDITION.retraite.titre}
        description={DEFINITIONS_EDITION.retraite.description}
      >
        <form action="/editions" method="get" className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="text-foreground block text-sm font-medium">
              Année de départ à la retraite
            </span>
            <input
              type="number"
              name="annee"
              defaultValue={annee}
              min={ANNEE_MIN}
              max={ANNEE_MAX}
              step={1}
              required
              inputMode="numeric"
              className="border-border bg-background focus:border-primary focus:ring-primary/15 w-32 rounded-2xl border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </label>
          <button type="submit" className={BOUTON}>
            Afficher le décompte
          </button>
          <button type="submit" formAction="/editions/retraite/pdf" className={BOUTON}>
            <FileDown size={16} aria-hidden="true" />
            PDF
          </button>
          <button type="submit" formAction="/editions/retraite/csv" className={BOUTON}>
            <FileSpreadsheet size={16} aria-hidden="true" />
            Excel (CSV)
          </button>
        </form>

        <div role="status" className="text-sm">
          {retraites.length === 0 ? (
            <p className="text-muted-foreground">Aucun enseignant à la retraite en {annee}.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-foreground font-medium">
                {titreEdition(demande)} : {retraites.length} enseignant
                {retraites.length > 1 ? 's' : ''}
              </p>
              <ul className="text-muted-foreground divide-border border-border divide-y rounded-2xl border">
                {parEtablissement.map((etablissement) => (
                  <li
                    key={etablissement.id}
                    className="flex items-center justify-between gap-4 px-4 py-2"
                  >
                    <span>{etablissement.nom}</span>
                    <span className="text-foreground font-medium tabular-nums">
                      {etablissement.lignes.length}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CarteEdition>
    </div>
  )
}
