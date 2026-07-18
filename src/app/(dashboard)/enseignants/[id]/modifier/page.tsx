import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { recupererDonneesFormulaire, recupererEnseignantDetail } from '../../donnees'
import { FormulaireEnseignant } from '../../formulaire-cascade'
import { PageHeader } from '@/components/layout/page-header'

export default async function ModifierEnseignant({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [enseignant, donnees] = await Promise.all([
    recupererEnseignantDetail(id),
    recupererDonneesFormulaire(),
  ])
  if (!enseignant) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/enseignants/${id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Retour au profil
      </Link>
      <PageHeader
        title="Modifier l'enseignant"
        description={`${enseignant.nom} ${enseignant.prenom} — ${enseignant.matricule}`}
      />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <FormulaireEnseignant
          mode="modifier"
          enseignant={enseignant}
          etablissements={donnees.etablissements}
          departements={donnees.departements}
          departementsOrigine={donnees.departementsOrigine}
          grille={donnees.grille}
        />
      </div>
    </div>
  )
}
