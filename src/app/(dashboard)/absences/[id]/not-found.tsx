import { SearchX } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundAbsence() {
  return (
    <EtatPage
      icon={SearchX}
      titre="Absence introuvable"
      message="Cette absence n'existe pas ou a été supprimée."
      lienRetour="/absences"
      labelRetour="Retour à la liste des absences"
    />
  )
}
