import { SearchX } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundEnseignant() {
  return (
    <EtatPage
      icon={SearchX}
      titre="Enseignant introuvable"
      message="Cet enseignant n'existe pas ou a été supprimé."
      lienRetour="/enseignants"
      labelRetour="Retour à la liste des enseignants"
    />
  )
}
