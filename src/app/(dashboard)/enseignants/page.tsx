import Link from 'next/link'
import { UserCheck, UserMinus, UserX, Users, FileDown, Plus, Pencil } from 'lucide-react'
import {
  recupererEnseignants,
  recupererStatsEnseignants,
  recupererEffectifsParEtablissement,
  recupererEffectifsParGrade,
  recupererEnseignantsEligiblesRetraite,
  recupererEnseignantsProchesRetraite,
} from './donnees'
import { GraphiqueEffectifsParSexe } from '@/components/charts/graphique-effectifs-sexe'
import { GraphiqueEffectifsParGrade } from '@/components/charts/graphique-effectifs-grade'
import { StatCard } from '@/components/dashboard/stat-card'
import { ChartCard } from '@/components/dashboard/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'

type Recherche = { page?: string; recherche?: string; trier?: string }

function construireLien(params: Recherche, page: number) {
  const sp = new URLSearchParams()
  if (params.recherche) sp.set('recherche', params.recherche)
  if (params.trier) sp.set('trier', params.trier)
  sp.set('page', String(page))
  return `/enseignants?${sp.toString()}`
}

export default async function PageEnseignants({
  searchParams,
}: {
  searchParams: Promise<Recherche>
}) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  const [liste, stats, effectifsEtablissement, effectifsGrade, eligiblesRetraite, prochesRetraite] =
    await Promise.all([
      recupererEnseignants({
        page,
        recherche: params.recherche,
        triGrade: params.trier === 'grade' ? 'asc' : undefined,
        triStatut: params.trier === 'statut' ? 'asc' : undefined,
      }),
      recupererStatsEnseignants(),
      recupererEffectifsParEtablissement(),
      recupererEffectifsParGrade(),
      recupererEnseignantsEligiblesRetraite(),
      recupererEnseignantsProchesRetraite(),
    ])

  return (
    <div className="space-y-8">
      <PageHeader title="Enseignants" description="Gestion des dossiers et effectifs permanents">
        <a
          href="/enseignants/liste-pdf"
          download
          className="border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium shadow-sm"
        >
          <FileDown size={16} />
          Exporter PDF
        </a>
        <Link
          href="/enseignants/nouveau"
          className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90"
        >
          <Plus size={16} />
          Nouvel enseignant
        </Link>
      </PageHeader>

      {eligiblesRetraite.length > 0 && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
          role="alert"
        >
          <p className="font-semibold">
            {eligiblesRetraite.length} enseignant(s) ont dépassé l&apos;âge de retraite
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {eligiblesRetraite.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/enseignants/${e.id}`}
                  className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium hover:bg-amber-200"
                >
                  {e.nom} {e.prenom}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prochesRetraite.length > 0 && (
        <div
          className="border-primary/20 bg-primary/5 rounded-2xl border px-5 py-4 text-sm"
          role="status"
        >
          <p className="text-foreground font-semibold">
            {prochesRetraite.length} enseignant(s) proche(s) de la retraite (2 ans)
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {prochesRetraite.slice(0, 8).map((e) => (
              <li key={e.id}>
                <Link
                  href={`/enseignants/${e.id}`}
                  className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {e.nom} {e.prenom} ({e.dateRetraitePrevue.getFullYear()})
                </Link>
              </li>
            ))}
            {prochesRetraite.length > 8 && (
              <li className="text-muted-foreground px-2 py-1 text-xs">
                +{prochesRetraite.length - 8} autre(s)
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total"
          value={stats.total}
          icon={Users}
          description="Enseignants enregistrés"
          color="blue"
        />
        <StatCard
          title="Actifs"
          value={stats.actifs}
          icon={UserCheck}
          description="En activité"
          color="green"
        />
        <StatCard
          title="Transférés"
          value={stats.transferes}
          icon={UserMinus}
          description="Hors UN"
          color="amber"
        />
        <StatCard
          title="Retraités"
          value={stats.retraites}
          icon={UserX}
          description="Départ à la retraite"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Effectifs par établissement"
          subtitle="Répartition hommes / femmes — actifs"
          className="lg:col-span-2"
        >
          <GraphiqueEffectifsParSexe donnees={effectifsEtablissement} />
        </ChartCard>
        <ChartCard title="Effectifs par grade" subtitle="Enseignants actifs">
          <GraphiqueEffectifsParGrade donnees={effectifsGrade} />
        </ChartCard>
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <input
          type="search"
          name="recherche"
          defaultValue={params.recherche}
          placeholder="Rechercher par nom ou matricule..."
          className="border-border bg-card focus:border-primary focus:ring-primary/20 min-w-[200px] flex-1 rounded-2xl border px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:outline-none"
        />
        <select
          name="trier"
          defaultValue={params.trier ?? ''}
          className="border-border bg-card rounded-2xl border px-4 py-2.5 text-sm shadow-sm"
        >
          <option value="">Trier par nom</option>
          <option value="grade">Trier par grade</option>
          <option value="statut">Trier par statut</option>
        </select>
        <button
          type="submit"
          className="border-border bg-card hover:bg-muted rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-sm"
        >
          Rechercher
        </button>
      </form>

      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/30 text-muted-foreground border-b text-left">
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-3 py-3 font-medium">Matricule</th>
              <th className="px-3 py-3 font-medium">Grade</th>
              <th className="px-3 py-3 font-medium">Établissement</th>
              <th className="px-3 py-3 font-medium">Statut</th>
              <th className="px-3 py-3 font-medium">Retraite</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {liste.enseignants.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-10 text-center">
                  Aucun enseignant trouvé.
                </td>
              </tr>
            ) : (
              liste.enseignants.map((e) => (
                <tr key={e.id} className="border-border hover:bg-muted/20 border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">
                    <Link
                      href={`/enseignants/${e.id}`}
                      className="hover:text-primary flex items-center gap-3"
                    >
                      {e.photoUrl ? (
                        <img
                          src={e.photoUrl}
                          alt={`${e.nom} ${e.prenom}`}
                          className="h-10 w-10 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-bold">
                          {e.prenom.charAt(0)}
                          {e.nom.charAt(0)}
                        </div>
                      )}
                      <span>
                        {e.nom} {e.prenom}
                      </span>
                    </Link>
                  </td>
                  <td className="text-muted-foreground px-3 py-3">{e.matricule}</td>
                  <td className="text-muted-foreground px-3 py-3">
                    {LIBELLES_GRADE[e.grade] ?? e.grade}
                  </td>
                  <td className="text-muted-foreground px-3 py-3">
                    {e.departement.etablissement.abreviation}
                  </td>
                  <td className="px-3 py-3">
                    <BadgeStatut statut={e.statut} />
                  </td>
                  <td className="text-muted-foreground px-3 py-3">{e.anneeRetraitePrevue}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/enseignants/${e.id}`}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Voir
                      </Link>
                      {e.statut === 'ACTIF' && (
                        <Link
                          href={`/enseignants/${e.id}/modifier`}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>
          Page {liste.page} sur {liste.totalPages} ({liste.total} enseignant
          {liste.total > 1 ? 's' : ''})
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={construireLien(params, page - 1)}
              className="border-border bg-card hover:bg-muted rounded-2xl border px-3 py-1.5 shadow-sm"
            >
              Précédent
            </Link>
          )}
          {page < liste.totalPages && (
            <Link
              href={construireLien(params, page + 1)}
              className="border-border bg-card hover:bg-muted rounded-2xl border px-3 py-1.5 shadow-sm"
            >
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
    ACTIF: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    TRANSFERE: 'bg-amber-50 text-amber-700 ring-amber-100',
    RETRAITE: 'bg-muted text-muted-foreground ring-border',
  }
  const libelles: Record<string, string> = {
    ACTIF: 'Actif',
    TRANSFERE: 'Transféré',
    RETRAITE: 'Retraité',
  }
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[statut]}`}
    >
      {libelles[statut]}
    </span>
  )
}
