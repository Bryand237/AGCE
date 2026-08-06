import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundAvancementModifier() {
  return (
    <div className="px-4 py-10">
      <EtatPage
        icon={AlertTriangle}
        titre="Page introuvable"
        message="La page de modification est introuvable."
        lienRetour="/avancements"
        labelRetour="Retour aux avancements"
      />
    </div>
  )
}
