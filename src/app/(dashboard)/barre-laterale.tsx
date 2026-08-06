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
    <aside className="border-border bg-card sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r">
      <div className="border-border flex items-center gap-3 border-b px-5 py-6">
        <div className="bg-primary text-primary-foreground flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold shadow-md">
          AGCE
        </div>
        <div>
          <p className="text-foreground text-sm font-bold tracking-tight">AGCE</p>
          <p className="text-muted-foreground text-xs">Carrière enseignants</p>
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

      <div className="border-primary/20 bg-primary/5 text-muted-foreground m-4 rounded-2xl border p-4 text-xs leading-relaxed">
        <p className="text-primary font-medium">Rappel</p>
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
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-border bg-card/95 sticky top-0 z-10 flex h-[4.25rem] items-center gap-4 border-b px-6 backdrop-blur-md">
        <nav className="text-muted-foreground hidden shrink-0 items-center gap-1.5 text-sm lg:flex">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Accueil
          </Link>
          {segments.map((seg, i) => {
            const href = `/${segments.slice(0, i + 1).join('/')}`
            const isLast = i === segments.length - 1
            return (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-border">/</span>
                {isLast ? (
                  <span className="text-foreground font-medium">{libelleSegment(seg)}</span>
                ) : (
                  <Link href={href} className="hover:text-foreground transition-colors">
                    {libelleSegment(seg)}
                  </Link>
                )}
              </span>
            )
          })}
        </nav>

        <form onSubmit={handleRecherche} className="mx-auto hidden max-w-lg flex-1 md:block">
          <div className="relative">
            <Search
              size={16}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <input
              name="recherche"
              type="search"
              placeholder="Rechercher un enseignant..."
              className="border-border bg-muted/60 placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:ring-primary/15 w-full rounded-2xl border py-2.5 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            title="Notifications"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
          >
            <Bell size={18} />
          </button>
          <button
            type="button"
            title="Paramètres"
            className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-9 w-9 items-center justify-center rounded-xl transition-colors sm:flex"
          >
            <Settings size={18} />
          </button>

          <div className="bg-border mx-1 hidden h-6 w-px sm:block" />

          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="text-right">
              <p className="text-foreground text-sm font-semibold">{nomUtilisateur}</p>
              <p className="text-muted-foreground text-xs">Administrateur</p>
            </div>
            <div className="bg-primary/10 text-primary ring-primary/20 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ring-2">
              {nomUtilisateur.charAt(0).toUpperCase()}
            </div>
          </div>

          <form action={seDeconnecter}>
            <button
              type="submit"
              title="Déconnexion"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
            >
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </header>

      <main className="bg-background min-h-0 flex-1 overflow-auto">
        <form
          onSubmit={handleRecherche}
          className="border-border bg-card border-b px-4 py-3 md:hidden"
        >
          <div className="relative">
            <Search
              size={16}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <input
              name="recherche"
              type="search"
              placeholder="Rechercher un enseignant..."
              className="border-border bg-muted/60 placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:ring-primary/15 w-full rounded-2xl border py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
        </form>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
