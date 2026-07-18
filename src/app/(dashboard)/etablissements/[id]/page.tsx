import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { recupererEtablissementParId } from '../donnees'
import { FormulaireDepartement, BoutonSupprimerEtablissement } from '../formulaires'

const LIBELLES_TYPE: Record<string, string> = {
  ECOLE: 'École',
  FACULTE: 'Faculté',
}

export default async function DetailEtablissement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const etablissement = await recupererEtablissementParId(id)
  if (!etablissement) notFound()

  const nombreEnseignants = etablissement.departements.reduce(
    (somme, d) => somme + d._count.enseignants,
    0
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/etablissements" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />
            Retour à la liste
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
              {etablissement.abreviation.slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{etablissement.nom}</h1>
              <p className="text-sm text-muted-foreground">
                {LIBELLES_TYPE[etablissement.type]} · {etablissement.abreviation} ·{' '}
                {etablissement._count.departements} département
                {etablissement._count.departements > 1 ? 's' : ''} · {nombreEnseignants} enseignant
                {nombreEnseignants > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <Link href={`/etablissements/${id}/modifier`} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted">
          <Pencil size={16} />
          Modifier
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-bold text-foreground">Départements rattachés</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-6 py-3 font-medium">Département</th>
              <th className="px-3 py-3 font-medium">Abréviation</th>
              <th className="px-3 py-3 font-medium">Enseignants</th>
            </tr>
          </thead>
          <tbody>
            {etablissement.departements.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                  Aucun département rattaché.
                </td>
              </tr>
            ) : (
              etablissement.departements.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-3 font-medium">{d.nom}</td>
                  <td className="px-3 py-3 text-muted-foreground">{d.abreviation}</td>
                  <td className="px-3 py-3 text-muted-foreground">{d._count.enseignants}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <FormulaireDepartement etablissementId={id} />
      <BoutonSupprimerEtablissement id={id} />
    </div>
  )
}
