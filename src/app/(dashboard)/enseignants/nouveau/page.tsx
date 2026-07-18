import { recupererDonneesFormulaire } from '../donnees'
import { FormulaireEnseignant } from '../formulaire-cascade'
import { PageHeader } from '@/components/layout/page-header'

export default async function NouvelEnseignant() {
  const { etablissements, departements, departementsOrigine, grille } =
    await recupererDonneesFormulaire()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nouvel enseignant"
        description="Enregistrer un nouvel enseignant permanent"
      />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <FormulaireEnseignant
          mode="creer"
          etablissements={etablissements}
          departements={departements}
          departementsOrigine={departementsOrigine}
          grille={grille}
        />
      </div>
    </div>
  )
}
