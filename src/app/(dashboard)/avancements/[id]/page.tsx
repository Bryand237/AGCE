import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { recupererRapportDetail } from '../donnees'
import { retirerSelection } from '../actions'
import { formaterClasseEchelonIndice } from '@/domain/avancement/formaterClasseEchelonIndice'
import {
  FormulaireAjouterEnseignant,
  BlocValiderOuRejeter,
  FormulaireMetadonneesSession,
} from '../formulaires'

export default async function DetailRapport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rapport = await recupererRapportDetail(id)
  if (!rapport) notFound()

  const estModifiable = rapport.statut !== 'VALIDE'
  const metadonneesRenseignees =
    rapport.referenceLoiFinances &&
    rapport.referenceCirculaire &&
    rapport.dateSessionCU &&
    rapport.dateSessionCA

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <Link
          href="/avancements"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft size={16} />
          Retour à la liste
        </Link>
        <h1 className="text-foreground text-2xl font-bold">Rapport {rapport.numero}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {rapport.periodeDebut.toLocaleDateString('fr-FR')} –{' '}
          {rapport.periodeFin.toLocaleDateString('fr-FR')} ·{' '}
          {rapport.statut === 'VALIDE'
            ? `Validé le ${rapport.dateValidation?.toLocaleDateString('fr-FR')} par ${rapport.auteurValidation}`
            : 'Non validé'}
        </p>
        {rapport.motifRejet && (
          <p className="border-destructive/30 bg-destructive/5 text-destructive mt-3 rounded-2xl border p-4 text-sm">
            Rejeté précédemment : {rapport.motifRejet}
          </p>
        )}
        {estModifiable && !metadonneesRenseignees && (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Renseignez les métadonnées du conseil avant de générer les décisions individuelles
            (sinon les mentions « Vu ; » et « session du ; » resteront vides).
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <a
          href={`/avancements/${id}/rapport-pdf`}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Download size={16} />
          Télécharger le rapport (PDF)
        </a>
      </div>

      <FormulaireMetadonneesSession
        rapportId={id}
        metadonnees={rapport}
        lectureSeule={!estModifiable}
      />

      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/30 text-muted-foreground border-b text-left">
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
                <td
                  colSpan={estModifiable ? 5 : 4}
                  className="text-muted-foreground px-4 py-10 text-center"
                >
                  Aucun enseignant sélectionné.
                </td>
              </tr>
            ) : (
              rapport.selections.map((s) => (
                <tr key={s.id} className="border-border hover:bg-muted/20 border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {s.enseignant.nom} {s.enseignant.prenom}
                  </td>
                  <td className="text-muted-foreground px-3 py-3">
                    {s.enseignant.departement.etablissement.abreviation}
                  </td>
                  <td className="text-muted-foreground px-3 py-3">
                    {formaterClasseEchelonIndice(s.enseignant.positionActuelle)}
                  </td>
                  <td className="text-muted-foreground px-3 py-3">
                    {formaterClasseEchelonIndice(s.positionProposee)}
                  </td>
                  {estModifiable && (
                    <td className="px-4 py-3">
                      <form action={retirerSelection.bind(null, id, s.enseignantId)}>
                        <button type="submit" className="text-destructive text-sm hover:underline">
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

      {!estModifiable && rapport.avancements.length > 0 && (
        <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div className="border-border border-b px-4 py-3">
            <h2 className="text-foreground text-sm font-bold">Décisions individuelles</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/30 text-muted-foreground border-b text-left">
                <th className="px-4 py-3 font-medium">Enseignant</th>
                <th className="px-3 py-3 font-medium">Ancien → Nouveau</th>
                <th className="px-4 py-3 font-medium">Décision</th>
              </tr>
            </thead>
            <tbody>
              {rapport.avancements.map((a) => (
                <tr key={a.id} className="border-border hover:bg-muted/20 border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {a.enseignant.nom} {a.enseignant.prenom}
                  </td>
                  <td className="text-muted-foreground px-3 py-3">
                    {formaterClasseEchelonIndice(a.anciennePosition)} →{' '}
                    {formaterClasseEchelonIndice(a.nouvellePosition)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/avancements/${id}/${a.id}`}
                      className="text-primary font-medium hover:underline"
                    >
                      {a.statutDecision ? 'Voir la décision' : 'Générer la décision'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {estModifiable && (
        <>
          <FormulaireAjouterEnseignant rapportId={id} />
          <BlocValiderOuRejeter rapportId={id} />
        </>
      )}
    </div>
  )
}
