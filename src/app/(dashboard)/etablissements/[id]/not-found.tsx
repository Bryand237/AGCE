import { SearchX } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundEtablissement() {
  return (
    <EtatPage
      icon={SearchX}
      titre="Établissement introuvable"
      message="Cet établissement n'existe pas ou a été supprimé."
      lienRetour="/etablissements"
      labelRetour="Retour à la liste des établissements"
    />
  )
}
