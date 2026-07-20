import type { ReactNode } from 'react'
import { BarreLaterale, EnTeteDashboard } from './barre-laterale'
import { recupererUtilisateurConnecte } from '@/lib/auth'

export default async function LayoutDashboard({ children }: { children: ReactNode }) {
  const utilisateur = await recupererUtilisateurConnecte()

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <BarreLaterale />
      <EnTeteDashboard nomUtilisateur={utilisateur?.nomUtilisateur ?? 'Admin'}>
        {children}
      </EnTeteDashboard>
    </div>
  )
}
