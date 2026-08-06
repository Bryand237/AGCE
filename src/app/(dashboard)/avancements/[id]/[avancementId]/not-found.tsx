import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundAvancementItem() {
  return (
    <div className="px-4 py-10">
      <EtatPage
        icon={AlertTriangle}
        titre="Page introuvable"
        message="La décision ou l'avancement demandé est introuvable."
        lienRetour="/avancements"
        labelRetour="Retour aux avancements"
      />
    </div>
  )
}
