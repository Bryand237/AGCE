import { FormulaireAbsence } from '../formulaire-type'
import { PageHeader } from '@/components/layout/page-header'

export default function NouvelleAbsence() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader title="Nouvelle absence" description="Déclarer un congé ou une mission" />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <FormulaireAbsence />
      </div>
    </div>
  )
}
