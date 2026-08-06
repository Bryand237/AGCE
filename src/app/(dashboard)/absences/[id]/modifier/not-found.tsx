import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundAbsenceModifier() {
  return (
    <div className="px-4 py-10">
      <EtatPage
        icon={AlertTriangle}
        titre="Page introuvable"
        message="La page de modification de l'absence est introuvable."
        lienRetour="/absences"
        labelRetour="Retour aux absences"
      />
    </div>
  )
}
