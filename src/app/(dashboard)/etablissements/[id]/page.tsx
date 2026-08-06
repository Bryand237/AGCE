import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, Layers, Pencil, Users } from 'lucide-react'
import { recupererEtablissementParIdPaged } from '../donnees'
import { FormulaireDepartement, BoutonSupprimerEtablissement } from '../formulaires'
import { StatCard } from '@/components/dashboard/stat-card'

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

  const { etablissement, departements, total, totalPages, totalEnseignants } = data

  const moyenneParDept =
    etablissement._count.departements > 0
      ? Math.round(totalEnseignants / etablissement._count.departements)
      : 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/etablissements"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft size={16} />
        Retour à la liste
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Zone gauche — carte établissement */}
        <aside className="border-border bg-card flex flex-col gap-6 rounded-2xl border p-6 shadow-sm lg:col-span-1">
          <div className="flex flex-col items-center gap-4 text-center">
            {etablissement.photoUrl ? (
              <Image
                src={etablissement.photoUrl}
                alt={etablissement.nom}
                className="rounded-2xl object-cover"
                width={96}
                height={96}
              />
            ) : (
              <div className="bg-primary/10 text-primary flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-bold">
                {etablissement.abreviation.slice(0, 2)}
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-foreground text-xl font-bold">{etablissement.nom}</h1>
              <p className="text-muted-foreground text-sm">{etablissement.abreviation}</p>
              <p className="text-muted-foreground text-sm">{LIBELLES_TYPE[etablissement.type]}</p>
            </div>
            <Link
              href={`/etablissements/${id}/modifier`}
              className="border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm"
            >
              <Pencil size={14} />
              Modifier
            </Link>
          </div>

          <div className="border-border border-t pt-5">
            <h2 className="text-foreground mb-3 text-xs font-bold tracking-wide uppercase">
              Vue d&apos;ensemble
            </h2>
            <dl className="space-y-3 text-sm">
              <Item label="Type" valeur={LIBELLES_TYPE[etablissement.type] ?? etablissement.type} />
              <Item label="Abréviation" valeur={etablissement.abreviation} />
              <Item label="Départements" valeur={String(etablissement._count.departements)} />
              <Item label="Enseignants" valeur={String(totalEnseignants)} />
            </dl>
          </div>
        </aside>

        {/* Zone droite */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="border-primary/20 bg-primary/5 rounded-2xl border px-6 py-5 shadow-sm">
            <h2 className="text-foreground mb-1 text-sm font-bold">Effectif</h2>
            <p className="text-foreground text-sm">
              <strong>{totalEnseignants}</strong> enseignant{totalEnseignants > 1 ? 's' : ''}{' '}
              réparti{totalEnseignants > 1 ? 's' : ''} sur{' '}
              <strong>{etablissement._count.departements}</strong> département
              {etablissement._count.departements > 1 ? 's' : ''}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Départements"
              value={etablissement._count.departements}
              icon={Layers}
              description="Unités rattachées"
              color="blue"
            />
            <StatCard
              title="Enseignants"
              value={totalEnseignants}
              icon={Users}
              description="Effectif total"
              color="green"
            />
            <StatCard
              title="Moyenne / dept."
              value={moyenneParDept}
              icon={Building2}
              description="Enseignants par département"
              color="amber"
            />
          </div>

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
              <FormulaireDepartement etablissementId={id} />
            </div>
            <div className="border-border bg-card flex items-start rounded-2xl border p-6 shadow-sm">
              <BoutonSupprimerEtablissement id={id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Item({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground mt-0.5 font-medium">{valeur}</dd>
    </div>
  )
}
