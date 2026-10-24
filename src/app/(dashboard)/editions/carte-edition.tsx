import { FileDown, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { regrouperParEtablissement } from '@/domain/editions/parEtablissement'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'

/** Style commun des boutons de la page. */
export const BOUTON_EDITION =
  'border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium shadow-sm'

/**
 * Cadre d'une liste officielle sur la page « Éditions » : son titre, ce qu'elle contient, son
 * éventuel avertissement, puis son contenu (paramètres, décompte, boutons de téléchargement).
 * Chaque nouvelle liste n'est qu'une carte de plus.
 */
export function CarteEdition({
  icone: Icone,
  titre,
  description,
  avertissement,
  children,
}: {
  icone: LucideIcon
  titre: string
  description: string
  avertissement?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-border bg-card rounded-2xl border p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <Icone size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-foreground text-base font-semibold">{titre}</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
          </div>
          {avertissement && (
            <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {avertissement}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  )
}

/**
 * Combien d'enseignants la liste contient, établissement par établissement. Le décompte est
 * calculé sur la même sélection que le PDF et le CSV : il ne peut pas en différer.
 */
export function DecompteEtablissements({
  intitule,
  lignes,
  messageSiVide,
}: {
  /** Titre de la liste (« Liste des enseignants transférés »). */
  intitule: string
  lignes: readonly LigneRecherche[]
  messageSiVide: string
}) {
  const parEtablissement = regrouperParEtablissement(lignes)
  return (
    <div role="status" className="text-sm">
      {lignes.length === 0 ? (
        <p className="text-muted-foreground">{messageSiVide}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-foreground font-medium">
            {intitule} : {lignes.length} enseignant{lignes.length > 1 ? 's' : ''}
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
  )
}

/** PDF et Excel d'une liste qui n'a pas de paramètre : deux liens de téléchargement. */
export function TelechargementsEdition({ cle }: { cle: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={`/editions/${cle}/pdf`} download className={BOUTON_EDITION}>
        <FileDown size={16} aria-hidden="true" />
        PDF
      </a>
      <a href={`/editions/${cle}/csv`} download className={BOUTON_EDITION}>
        <FileSpreadsheet size={16} aria-hidden="true" />
        Excel (CSV)
      </a>
    </div>
  )
}
