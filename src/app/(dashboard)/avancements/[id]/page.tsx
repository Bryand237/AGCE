import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { recupererRapportDetail } from '../donnees'
import { retirerSelection } from '../actions'
import { formaterPosition } from '@/domain/avancement/formaterPosition'
import { FormulaireAjouterEnseignant, BlocValiderOuRejeter } from '../formulaires'

export default async function DetailRapport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rapport = await recupererRapportDetail(id)
  if (!rapport) notFound()

  const estModifiable = rapport.statut !== 'VALIDE'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <Link href="/avancements" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Retour à la liste
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Rapport {rapport.numero}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rapport.periodeDebut.toLocaleDateString('fr-FR')} –{' '}
          {rapport.periodeFin.toLocaleDateString('fr-FR')} ·{' '}
          {rapport.statut === 'VALIDE'
            ? `Validé le ${rapport.dateValidation?.toLocaleDateString('fr-FR')} par ${rapport.auteurValidation}`
            : 'Non validé'}
        </p>
        {rapport.motifRejet && (
          <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Rejeté précédemment : {rapport.motifRejet}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Enseignant</th>
              <th className="px-3 py-3 font-medium">Établissement</th>
              <th className="px-3 py-3 font-medium">Position actuelle</th>
              <th className="px-3 py-3 font-medium">Position proposée</th>
              {estModifiable && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {rapport.selections.length === 0 ? (
              <tr>
                <td colSpan={estModifiable ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun enseignant sélectionné.
                </td>
              </tr>
            ) : (
              rapport.selections.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    {s.enseignant.nom} {s.enseignant.prenom}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {s.enseignant.departement.etablissement.abreviation}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {formaterPosition(s.enseignant.positionActuelle)} ({s.enseignant.positionActuelle.indice})
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {formaterPosition(s.positionProposee)} ({s.positionProposee.indice})
                  </td>
                  {estModifiable && (
                    <td className="px-4 py-3">
                      <form action={retirerSelection.bind(null, id, s.enseignantId)}>
                        <button type="submit" className="text-sm text-destructive hover:underline">
                          Retirer
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {estModifiable && (
        <>
          <FormulaireAjouterEnseignant rapportId={id} />
          <BlocValiderOuRejeter rapportId={id} />
        </>
      )}
    </div>
  )
}
