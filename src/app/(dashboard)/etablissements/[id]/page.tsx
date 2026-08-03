import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { recupererEtablissementParIdPaged } from '../donnees'
import { FormulaireDepartement, BoutonSupprimerEtablissement } from '../formulaires'

const LIBELLES_TYPE: Record<string, string> = {
  ECOLE: 'École',
  FACULTE: 'Faculté',
}

export default async function DetailEtablissement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const page = Number(sp.page ?? 1)

  const data = await recupererEtablissementParIdPaged(id, page, 10)
  if (!data) notFound()

  const { etablissement, departements, total, totalPages } = data

  const nombreEnseignants = departements.reduce((somme, d) => somme + d._count.enseignants, 0)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/etablissements"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft size={16} />
            Retour à la liste
          </Link>
          <div className="flex items-center gap-3">
            {etablissement.photoUrl ? (
              <img
                src={etablissement.photoUrl}
                alt={etablissement.nom}
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold">
                {etablissement.abreviation.slice(0, 2)}
              </div>
            )}
            <div>
              <h1 className="text-foreground text-2xl font-bold">{etablissement.nom}</h1>
              <p className="text-muted-foreground text-sm">
                {LIBELLES_TYPE[etablissement.type]} · {etablissement.abreviation} ·{' '}
                {etablissement._count.departements} département
                {etablissement._count.departements > 1 ? 's' : ''} · {nombreEnseignants} enseignant
                {nombreEnseignants > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/etablissements/${id}/modifier`}
          className="border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium shadow-sm"
        >
          <Pencil size={16} />
          Modifier
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <section className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
            <div className="border-border border-b px-6 py-4">
              <h2 className="text-foreground text-sm font-bold">Départements rattachés</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/30 text-muted-foreground border-b text-left">
                  <th className="px-6 py-3 font-medium">Département</th>
                  <th className="px-3 py-3 font-medium">Abréviation</th>
                  <th className="px-3 py-3 font-medium">Enseignants</th>
                </tr>
              </thead>
              <tbody>
                {departements.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-muted-foreground px-6 py-10 text-center">
                      Aucun département rattaché.
                    </td>
                  </tr>
                ) : (
                  departements.map((d) => (
                    <tr
                      key={d.id}
                      className="border-border hover:bg-muted/20 border-b last:border-0"
                    >
                      <td className="px-6 py-3 font-medium">{d.nom}</td>
                      <td className="text-muted-foreground px-3 py-3">{d.abreviation}</td>
                      <td className="text-muted-foreground px-3 py-3">{d._count.enseignants}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="border-border bg-muted/5 flex items-center justify-between border-t px-4 py-3">
              <div className="text-muted-foreground text-sm">{total} département(s)</div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/etablissements/${id}?page=${Math.max(1, page - 1)}`}
                  className={`rounded-md px-3 py-1 text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                >
                  Préc
                </Link>
                <span className="text-sm">
                  {page} / {totalPages}
                </span>
                <Link
                  href={`/etablissements/${id}?page=${Math.min(totalPages, page + 1)}`}
                  className={`rounded-md px-3 py-1 text-sm ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
                >
                  Suiv
                </Link>
              </div>
            </div>
          </section>
        </div>

        <aside className="md:col-span-1">
          <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
            <FormulaireDepartement etablissementId={id} />
          </div>
          <div className="mt-4">
            <BoutonSupprimerEtablissement id={id} />
          </div>
        </aside>
      </div>
    </div>
  )
}
