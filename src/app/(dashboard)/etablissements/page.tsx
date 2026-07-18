import Link from 'next/link'
import { Building2, Layers, Users, GraduationCap, Plus } from 'lucide-react'
import { recupererEtablissements, recupererStatsEtablissements } from './donnees'
import { recupererEffectifsParEtablissement } from '@/lib/statistiques/effectifs'
import { GraphiqueEffectifsParSexe } from '@/components/charts/graphique-effectifs-sexe'
import { StatCard } from '@/components/dashboard/stat-card'
import { ChartCard } from '@/components/dashboard/chart-card'
import { PageHeader } from '@/components/layout/page-header'

type Recherche = { page?: string; recherche?: string; tri?: 'asc' | 'desc' }

const LIBELLES_TYPE: Record<string, string> = {
  ECOLE: 'École',
  FACULTE: 'Faculté',
}

function construireLien(params: Recherche, page: number) {
  const sp = new URLSearchParams()
  if (params.recherche) sp.set('recherche', params.recherche)
  if (params.tri) sp.set('tri', params.tri)
  sp.set('page', String(page))
  return `/etablissements?${sp.toString()}`
}

export default async function PageEtablissements({
  searchParams,
}: {
  searchParams: Promise<Recherche>
}) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const tri = params.tri === 'desc' ? 'desc' : 'asc'

  const [liste, stats, effectifs] = await Promise.all([
    recupererEtablissements({ page, recherche: params.recherche, tri }),
    recupererStatsEtablissements(),
    recupererEffectifsParEtablissement(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Établissements"
        description="Structures académiques et départements rattachés"
      >
        <Link href="/etablissements/nouveau" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
          <Plus size={16} />
          Nouvel établissement
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Établissements" value={stats.totalEtablissements} icon={Building2} description="Structures enregistrées" color="blue" />
        <StatCard title="Départements" value={stats.totalDepartements} icon={Layers} description="Unités académiques" color="green" />
        <StatCard title="Enseignants" value={stats.totalEnseignants} icon={Users} description="Effectif total" color="amber" />
        <StatCard title="Écoles / Facultés" value={`${stats.ecoles} / ${stats.facultes}`} icon={GraduationCap} description="Répartition par type" color="purple" />
      </div>

      <ChartCard title="Enseignants par établissement" subtitle="Répartition hommes / femmes — actifs">
        <GraphiqueEffectifsParSexe donnees={effectifs} />
      </ChartCard>

      <form method="get" className="flex flex-wrap gap-3">
        <input
          type="search"
          name="recherche"
          defaultValue={params.recherche}
          placeholder="Rechercher par nom..."
          className="min-w-[200px] flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        <select name="tri" defaultValue={params.tri ?? 'asc'} className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm">
          <option value="asc">Type : École → Faculté</option>
          <option value="desc">Type : Faculté → École</option>
        </select>
        <button type="submit" className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-muted">
          Rechercher
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-3 py-3 font-medium">Abréviation</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Départements</th>
              <th className="px-3 py-3 font-medium">Enseignants</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {liste.etablissements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun établissement trouvé.
                </td>
              </tr>
            ) : (
              liste.etablissements.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/etablissements/${e.id}`} className="text-foreground hover:text-primary">
                      {e.nom}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{e.abreviation}</td>
                  <td className="px-3 py-3">{LIBELLES_TYPE[e.type] ?? e.type}</td>
                  <td className="px-3 py-3 text-muted-foreground">{e._count.departements}</td>
                  <td className="px-3 py-3 text-muted-foreground">{e.nombreEnseignants}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/etablissements/${e.id}`} className="text-sm font-medium text-primary hover:underline">
                      Voir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {liste.page} sur {liste.totalPages} ({liste.total} établissement
          {liste.total > 1 ? 's' : ''})
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={construireLien(params, page - 1)} className="rounded-2xl border border-border bg-card px-3 py-1.5 shadow-sm hover:bg-muted">
              Précédent
            </Link>
          )}
          {page < liste.totalPages && (
            <Link href={construireLien(params, page + 1)} className="rounded-2xl border border-border bg-card px-3 py-1.5 shadow-sm hover:bg-muted">
              Suivant
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
