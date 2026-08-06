import { SearchX } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFound() {
  return (
    <EtatPage
      icon={SearchX}
      titre="Page introuvable"
      message="Cette page n'existe pas ou a été déplacée."
      lienRetour="/dashboard"
      labelRetour="Retour au tableau de bord"
    />
  )
}
