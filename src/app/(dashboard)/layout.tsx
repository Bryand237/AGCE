import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { BarreLaterale, EnTeteDashboard } from './barre-laterale'
import { recupererUtilisateurConnecte } from '@/lib/auth'
import { FournisseurNotifications, NotificateurUrl } from '@/components/ui/notifications'

export default async function LayoutDashboard({ children }: { children: ReactNode }) {
  const utilisateur = await recupererUtilisateurConnecte()

  if (!utilisateur) {
    redirect('/connexion')
  }

  return (
    <FournisseurNotifications>
      <div className="bg-background flex h-screen overflow-hidden">
        <BarreLaterale />
        <EnTeteDashboard nomUtilisateur={utilisateur.nomUtilisateur}>{children}</EnTeteDashboard>
      </div>
      {/* Affiche le message `?msg=` laissé par une action qui a redirigé, puis le retire de l'adresse. */}
      <Suspense fallback={null}>
        <NotificateurUrl />
      </Suspense>
    </FournisseurNotifications>
  )
}
