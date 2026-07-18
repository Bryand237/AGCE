import Link from 'next/link'
import { TrendingUp, FileCheck, FilePen, Users, Plus } from 'lucide-react'
import { recupererStatsRapports, recupererEffectifsAvancementParGradeSexe, recupererRapports } from './donnees'
import { GraphiqueEffectifsParSexe } from '@/components/charts/graphique-effectifs-sexe'
import { StatCard } from '@/components/dashboard/stat-card'
import { ChartCard } from '@/components/dashboard/chart-card'
import { PageHeader } from '@/components/layout/page-header'

export default async function PageAvancements({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; recherche?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  const [stats, effectifs, { rapports, totalPages }] = await Promise.all([
    recupererStatsRapports(),
    recupererEffectifsAvancementParGradeSexe(),
    recupererRapports({ page, recherche: params.recherche }),
  ])

  function construireLien(p: number) {
    const sp = new URLSearchParams()
    if (params.recherche) sp.set('recherche', params.recherche)
    sp.set('page', String(p))
    return `/avancements?${sp.toString()}`
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Avancements" description="Rapports de session et sélections indiciaires">
        <Link href="/avancements/nouveau" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
          <Plus size={16} />
          Nouveau rapport
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Rapports" value={stats.total} icon={TrendingUp} description="Sessions enregistrées" color="blue" />
        <StatCard title="Validés" value={stats.valides} icon={FileCheck} description="Décisions appliquées" color="green" />
        <StatCard title="Non validés" value={stats.brouillons} icon={FilePen} description="En cours de préparation" color="amber" />
        <StatCard title="Ce semestre" value={stats.enseignantsCeSemestre} icon={Users} description="Enseignants sélectionnés" color="purple" />
      </div>

      <ChartCard title="Avancements par grade" subtitle="Semestre le plus récent — répartition H/F">
        <GraphiqueEffectifsParSexe donnees={effectifs} />
      </ChartCard>

      <form method="get" className="flex flex-wrap gap-3">
        <input
          type="search"
          name="recherche"
          defaultValue={params.recherche}
          placeholder="Rechercher par édition ou date (AAAA-MM-JJ)..."
          className="min-w-[200px] flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        <button type="submit" className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-muted">
          Rechercher
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Édition</th>
              <th className="px-3 py-3 font-medium">Période</th>
              <th className="px-3 py-3 font-medium">Statut</th>
              <th className="px-3 py-3 font-medium">Enseignants</th>
            </tr>
          </thead>
          <tbody>
            {rapports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun rapport trouvé.
                </td>
              </tr>
            ) : (
              rapports.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/avancements/${r.id}`} className="hover:text-primary">
                      {r.numero}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {r.periodeDebut.toLocaleDateString('fr-FR')} – {r.periodeFin.toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        r.statut === 'VALIDE'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-amber-50 text-amber-700 ring-amber-100'
                      }`}
                    >
                      {r.statut === 'VALIDE' ? 'Validé' : 'Non validé'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{r._count.selections}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {page} sur {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={construireLien(page - 1)} className="rounded-2xl border border-border bg-card px-3 py-1.5 shadow-sm hover:bg-muted">
              Précédent
            </Link>
          )}
          {page < totalPages && (
            <Link href={construireLien(page + 1)} className="rounded-2xl border border-border bg-card px-3 py-1.5 shadow-sm hover:bg-muted">
              Suivant
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
