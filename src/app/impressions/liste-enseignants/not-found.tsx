import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundImpressionsListe() {
  return (
    <div className="px-4 py-10">
      <EtatPage
        icon={AlertTriangle}
        titre="Page introuvable"
        message="La liste d'enseignants à imprimer est introuvable."
        lienRetour="/impressions"
        labelRetour="Retour"
      />
    </div>
  )
}
