import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundEtablissementNouveau() {
  return (
    <div className="px-4 py-10">
      <EtatPage
        icon={AlertTriangle}
        titre="Page introuvable"
        message="La page de création d'établissement est introuvable."
        lienRetour="/etablissements"
        labelRetour="Retour aux établissements"
      />
    </div>
  )
}
