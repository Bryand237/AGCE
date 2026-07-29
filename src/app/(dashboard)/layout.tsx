import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { BarreLaterale, EnTeteDashboard } from './barre-laterale'
import { recupererUtilisateurConnecte } from '@/lib/auth'

export default async function LayoutDashboard({ children }: { children: ReactNode }) {
  const utilisateur = await recupererUtilisateurConnecte()

  if (!utilisateur) {
    redirect('/connexion')
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <BarreLaterale />
      <EnTeteDashboard nomUtilisateur={utilisateur.nomUtilisateur}>{children}</EnTeteDashboard>
    </div>
  )
}
