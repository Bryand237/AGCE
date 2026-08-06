import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function NotFoundImprimerListeEtablissement() {
  return (
    <div className="px-4 py-10">
      <EtatPage
        icon={AlertTriangle}
        titre="Page introuvable"
        message="La liste pour cet établissement est introuvable."
        lienRetour="/imprimer"
        labelRetour="Retour"
      />
    </div>
  )
}
