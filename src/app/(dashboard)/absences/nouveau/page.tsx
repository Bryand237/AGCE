import { PageHeader } from '@/components/layout/page-header'
import { FormulaireAbsence } from '../formulaire-type'
import { recupererEnseignantsActifsPourAbsence } from '../donnees'

export default async function NouvelleAbsence() {
  const enseignants = await recupererEnseignantsActifsPourAbsence()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader title="Nouvelle absence" description="Déclarer un congé ou une mission" />
      <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
        <FormulaireAbsence enseignants={enseignants} />
      </div>
    </div>
  )
}
