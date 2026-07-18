import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Mars,
  UserCheck,
  Users,
  Venus,
  Plus,
  Building2,
  CalendarOff,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import {
  recupererStatsDashboard,
  recupererRepartitionParGrade,
  recupererRepartitionParRegion,
  recupererRepartitionParEtablissement,
} from './donnees'
import { recupererUtilisateurConnecte } from '@/lib/auth'
import { ChartParEtablissement } from '@/components/dashboard/chart-par-etablissement'
import { ChartParRegion } from '@/components/dashboard/chart-par-region'
import { ChartRepartitionGrade } from '@/components/dashboard/chart-repartition-grade'
import { ChartCard } from '@/components/dashboard/chart-card'
import { StatCard } from '@/components/dashboard/stat-card'

const ACCES_RAPIDES = [
  {
    href: '/enseignants/nouveau',
    label: 'Nouvel enseignant',
    description: 'Enregistrer un dossier',
    icone: Plus,
  },
  {
    href: '/absences/nouveau',
    label: 'Nouvelle absence',
    description: 'Déclarer un congé',
    icone: CalendarOff,
  },
  {
    href: '/avancements/nouveau',
    label: 'Rapport avancement',
    description: 'Générer une sélection',
    icone: TrendingUp,
  },
  {
    href: '/etablissements/nouveau',
    label: 'Établissement',
    description: 'Ajouter une structure',
    icone: Building2,
  },
] as const

export default async function PageDashboard() {
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })

  const [utilisateur, stats, gradeData, regionData, etablissementData] = await Promise.all([
    recupererUtilisateurConnecte(),
    recupererStatsDashboard(),
    recupererRepartitionParGrade(),
    recupererRepartitionParRegion(),
    recupererRepartitionParEtablissement(),
  ])

  const prenom = utilisateur?.nomUtilisateur ?? 'Admin'

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm lg:p-8">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary capitalize">{today}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              Bonjour, {prenom}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Vue d&apos;ensemble des effectifs permanents — {stats.enseignantsActifs}{' '}
              enseignant{stats.enseignantsActifs > 1 ? 's' : ''} actif
              {stats.enseignantsActifs > 1 ? 's' : ''} réparti
              {stats.enseignantsActifs > 1 ? 's' : ''} sur {stats.totalEtablissements}{' '}
              établissement{stats.totalEtablissements > 1 ? 's' : ''}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">Absences en cours</p>
              <p className="text-xl font-bold text-foreground">{stats.absencesEnCours}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">Établissements</p>
              <p className="text-xl font-bold text-foreground">{stats.totalEtablissements}</p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total enseignants"
          value={stats.totalEnseignants}
          icon={Users}
          description="Enseignants enregistrés"
          color="blue"
        />
        <StatCard
          title="Enseignants actifs"
          value={stats.enseignantsActifs}
          icon={UserCheck}
          description="En activité"
          color="green"
        />
        <StatCard
          title="Hommes"
          value={stats.hommes}
          icon={Mars}
          description="Enseignants masculins"
          color="amber"
        />
        <StatCard
          title="Femmes"
          value={stats.femmes}
          icon={Venus}
          description="Enseignantes féminines"
          color="rose"
        />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Accès rapides
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACCES_RAPIDES.map(({ href, label, description, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icone size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <ArrowRight
                size={16}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[55%_45%]">
        <ChartCard
          title="Répartition par grade et par région"
          subtitle="Enseignants permanents actifs"
          action={
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Par région
            </span>
          }
        >
          <ChartParRegion data={regionData} />
        </ChartCard>

        <ChartCard
          title="Répartition par grade"
          subtitle="Vue globale des effectifs actifs"
          action={
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Global
            </span>
          }
        >
          <ChartRepartitionGrade data={gradeData} />
        </ChartCard>
      </div>

      <ChartCard
        title="Répartition par grade et par établissement"
        subtitle="Enseignants permanents actifs"
        action={
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            Par établissement
          </span>
        }
      >
        <ChartParEtablissement data={etablissementData} />
      </ChartCard>
    </div>
  )
}
