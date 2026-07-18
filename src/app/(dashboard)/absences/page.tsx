import Link from 'next/link'
import { CalendarOff, Clock, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import {
  synchroniserStatutsAbsences,
  recupererStatsAbsences,
  recupererEffectifsAbsenceParGradeSexe,
  recupererEffectifsParType,
  recupererAbsences,
} from './donnees'
import { GraphiqueEffectifsParSexe } from '@/components/charts/graphique-effectifs-sexe'
import { GraphiqueEffectifsParGrade } from '@/components/charts/graphique-effectifs-grade'
import { StatCard } from '@/components/dashboard/stat-card'
import { ChartCard } from '@/components/dashboard/chart-card'
import { PageHeader } from '@/components/layout/page-header'

const LIBELLES_TYPE: Record<string, string> = {
  MISSION: 'Mission',
  CONGE_MATERNITE: 'Congé de maternité',
  CONGE_MALADIE: 'Congé de maladie',
}
const LIBELLES_STATUT: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  EN_PERIODE: 'En période',
  DEPASSE: 'Dépassé',
  TERMINE: 'Terminé',
}

export default async function PageAbsences({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; recherche?: string; tri?: string }>
}) {
  await synchroniserStatutsAbsences()
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const tri = params.tri === 'grade' || params.tri === 'statut' ? params.tri : undefined

  const [stats, effectifsSexe, effectifsType, { absences, totalPages }] = await Promise.all([
    recupererStatsAbsences(),
    recupererEffectifsAbsenceParGradeSexe(),
    recupererEffectifsParType(),
    recupererAbsences({ page, recherche: params.recherche, tri }),
  ])

  function construireLien(p: number) {
    const sp = new URLSearchParams()
    if (params.recherche) sp.set('recherche', params.recherche)
    if (params.tri) sp.set('tri', params.tri)
    sp.set('page', String(p))
    return `/absences?${sp.toString()}`
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Absences" description="Congés, missions et suivi des retours">
        <Link href="/absences/nouveau" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
          <Plus size={16} />
          Nouvelle absence
        </Link>
      </PageHeader>

      {stats.depasse > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive" role="alert">
          <strong>{stats.depasse} absence{stats.depasse > 1 ? 's ont' : ' a'}</strong> dépassé
          {stats.depasse > 1 ? ' leur' : ' sa'} durée prévue — l&apos;enseignant n&apos;est pas encore
          rentré.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total" value={stats.total} icon={CalendarOff} description="Absences enregistrées" color="blue" />
        <StatCard title="En attente" value={stats.enAttente} icon={Clock} description="À valider" color="amber" />
        <StatCard title="En période" value={stats.enPeriode} icon={CheckCircle2} description="Absences en cours" color="green" />
        <StatCard title="Dépassées" value={stats.depasse} icon={AlertTriangle} description="Retour attendu" color="rose" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Par grade et sexe" subtitle="Absences en cours" className="lg:col-span-2">
          <GraphiqueEffectifsParSexe donnees={effectifsSexe} />
        </ChartCard>
        <ChartCard title="Par type" subtitle="Répartition globale">
          <GraphiqueEffectifsParGrade donnees={effectifsType} />
        </ChartCard>
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <input
          type="search"
          name="recherche"
          defaultValue={params.recherche}
          placeholder="Rechercher par nom ou matricule..."
          className="min-w-[200px] flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        <select name="tri" defaultValue={params.tri ?? ''} className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm">
          <option value="">Trier par date</option>
          <option value="grade">Trier par grade</option>
          <option value="statut">Trier par statut</option>
        </select>
        <button type="submit" className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-muted">
          Rechercher
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Enseignant</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Période</th>
              <th className="px-3 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {absences.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Aucune absence trouvée.
                </td>
              </tr>
            ) : (
              absences.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/absences/${a.id}`} className="hover:text-primary">
                      {a.enseignant.nom} {a.enseignant.prenom}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{LIBELLES_TYPE[a.type] ?? a.type}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {a.dateDebut.toLocaleDateString('fr-FR')} – {a.dateFin.toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-3 py-3">
                    <BadgeStatut statut={a.statut} />
                  </td>
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

function BadgeStatut({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    EN_ATTENTE: 'bg-amber-50 text-amber-700 ring-amber-100',
    EN_PERIODE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    DEPASSE: 'bg-red-50 text-red-700 ring-red-100',
    TERMINE: 'bg-muted text-muted-foreground ring-border',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[statut] ?? 'bg-muted text-muted-foreground'}`}>
      {LIBELLES_STATUT[statut] ?? statut}
    </span>
  )
}
