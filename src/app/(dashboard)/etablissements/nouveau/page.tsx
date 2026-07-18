import { FormulaireEtablissement } from '../formulaires'
import { PageHeader } from '@/components/layout/page-header'

export default function NouvelEtablissement() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader title="Nouvel établissement" description="Enregistrer une école ou une faculté" />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <FormulaireEtablissement action="creer" />
      </div>
    </div>
  )
}
