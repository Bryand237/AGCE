import { SearchX } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundAvancement() {
  return (
    <EtatPage
      icon={SearchX}
      titre="Rapport introuvable"
      message="Ce rapport n'existe pas ou a été supprimé."
      lienRetour="/avancements"
      labelRetour="Retour à la liste des rapports"
    />
  )
}
