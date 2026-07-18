'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarOff,
  TrendingUp,
  Search,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { seDeconnecter } from '@/app/connexion/actions'

const LIENS = [
  { href: '/dashboard', label: 'Tableau de bord', icone: LayoutDashboard, exact: true },
  { href: '/etablissements', label: 'Établissements', icone: Building2 },
  { href: '/enseignants', label: 'Enseignants', icone: Users },
  { href: '/absences', label: 'Absences', icone: CalendarOff },
  { href: '/avancements', label: 'Avancements', icone: TrendingUp },
]

const FIL_ARIANE: Record<string, string> = {
  dashboard: 'Tableau de bord',
  etablissements: 'Établissements',
  enseignants: 'Enseignants',
  absences: 'Absences',
  avancements: 'Avancements',
  nouveau: 'Nouveau',
  modifier: 'Modifier',
}

function libelleSegment(seg: string) {
  if (FIL_ARIANE[seg]) return FIL_ARIANE[seg]
  if (/^[0-9a-f-]{36}$/i.test(seg)) return 'Détail'
  return seg
}

export function BarreLaterale() {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md">
          AGCE
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">AGCE</p>
          <p className="text-xs text-muted-foreground">Carrière enseignants</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {LIENS.map(({ href, label, icone: Icone, exact }) => {
          const actif = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all',
                actif
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icone size={18} strokeWidth={actif ? 2.25 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="m-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-primary">Rappel</p>
        <p className="mt-1">Sauvegardez régulièrement la base de données — voir le README.</p>
      </div>
    </aside>
  )
}

export function EnTeteDashboard({
  nomUtilisateur,
  children,
}: {
  nomUtilisateur: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const segments = pathname.split('/').filter(Boolean)

  function handleRecherche(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const q = String(fd.get('recherche') ?? '').trim()
    if (q) router.push(`/enseignants?recherche=${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-[4.25rem] items-center gap-4 border-b border-border bg-card/95 px-6 backdrop-blur-md">
        <nav className="hidden shrink-0 items-center gap-1.5 text-sm text-muted-foreground lg:flex">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Accueil
          </Link>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-border">/</span>
              <span
                className={
                  i === segments.length - 1 ? 'font-medium text-foreground' : 'hover:text-foreground'
                }
              >
                {libelleSegment(seg)}
              </span>
            </span>
          ))}
        </nav>

        <form onSubmit={handleRecherche} className="mx-auto hidden max-w-lg flex-1 md:block">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              name="recherche"
              type="search"
              placeholder="Rechercher un enseignant..."
              className="w-full rounded-2xl border border-border bg-muted/60 py-2.5 pr-4 pl-10 text-sm placeholder:text-muted-foreground transition-colors focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            title="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell size={18} />
          </button>
          <button
            type="button"
            title="Paramètres"
            className="hidden h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
          >
            <Settings size={18} />
          </button>

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{nomUtilisateur}</p>
              <p className="text-xs text-muted-foreground">Administrateur</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20">
              {nomUtilisateur.charAt(0).toUpperCase()}
            </div>
          </div>

          <form action={seDeconnecter}>
            <button
              type="submit"
              title="Déconnexion"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-background">
        <form onSubmit={handleRecherche} className="border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              name="recherche"
              type="search"
              placeholder="Rechercher un enseignant..."
              className="w-full rounded-2xl border border-border bg-muted/60 py-2.5 pr-4 pl-10 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </div>
        </form>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
