import type { ReactNode } from 'react'
import { BarreLaterale, EnTeteDashboard } from './barre-laterale'
import { recupererUtilisateurConnecte } from '@/lib/auth'

export default async function LayoutDashboard({ children }: { children: ReactNode }) {
  const utilisateur = await recupererUtilisateurConnecte()

  return (
    <div className="flex min-h-screen bg-background">
      <BarreLaterale />
      <EnTeteDashboard nomUtilisateur={utilisateur?.nomUtilisateur ?? 'Admin'}>
        {children}
      </EnTeteDashboard>
    </div>
  )
}
