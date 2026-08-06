import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundConnexion() {
  return (
    <div className="px-4 py-10">
      <EtatPage
        icon={AlertTriangle}
        titre="Page introuvable"
        message="La page de connexion est introuvable."
        lienRetour="/"
        labelRetour="Accueil"
      />
    </div>
  )
}
