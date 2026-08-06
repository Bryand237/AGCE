import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundEnseignantNouveau() {
  return (
    <div className="px-4 py-10">
      <EtatPage
        icon={AlertTriangle}
        titre="Page introuvable"
        message="La page de création d'enseignant est introuvable."
        lienRetour="/enseignants"
        labelRetour="Retour aux enseignants"
      />
    </div>
  )
}
