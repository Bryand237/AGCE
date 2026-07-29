'use server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { recupererGrilleEchelonIndiciaire, recupererRapportDetail } from '../../donnees'
import { FormulaireModifierRapport, FormulaireModifierSelection } from '../../formulaires'
import { classeFormulaire } from '@/lib/ui-classes'

export default async function ModifierRapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [rapport, grille] = await Promise.all([
    recupererRapportDetail(id),
    recupererGrilleEchelonIndiciaire(),
  ])

  if (!rapport || rapport.statut !== 'VALIDE') notFound()

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/avancements/${id}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft size={16} />
            Retour au rapport
          </Link>
          <h1 className="text-foreground mt-3 text-2xl font-bold">
            Modifier le rapport {rapport.numero}
          </h1>
        </div>
      </div>

      <section className={classeFormulaire}>
        <FormulaireModifierRapport
          rapport={{
            id: rapport.id,
            numero: rapport.numero,
            periodeDebut: rapport.periodeDebut.toISOString(),
            periodeFin: rapport.periodeFin.toISOString(),
          }}
        />
      </section>

      <section className={classeFormulaire}>
        <h2 className="text-foreground text-lg font-semibold">Modifier la position proposée</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Si l’enseignant doit sauter plusieurs positions, mettez à jour sa proposition ici.
        </p>
        <div className="grid gap-4">
          {rapport.selections.map((selection) => (
            <div key={selection.id} className="border-border bg-card rounded-2xl border p-4">
              <h3 className="text-foreground mb-2 text-sm font-semibold">
                {selection.enseignant.nom} {selection.enseignant.prenom} —{' '}
                {selection.enseignant.matricule}
              </h3>
              <p className="text-muted-foreground mb-3 text-sm">
                Position actuelle :{' '}
                {selection.enseignant.positionActuelle.classe != null &&
                selection.enseignant.positionActuelle.echelon != null
                  ? `${selection.enseignant.positionActuelle.classe}C/${selection.enseignant.positionActuelle.echelon}E/${selection.enseignant.positionActuelle.indice}`
                  : `—/${selection.enseignant.positionActuelle.indice}`}
              </p>
              <FormulaireModifierSelection
                rapportId={id}
                selectionId={selection.id}
                positionProposeeId={selection.positionProposee.id}
                grille={grille}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
