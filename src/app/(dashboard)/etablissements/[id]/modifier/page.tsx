import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { recupererEtablissementParId } from '../../donnees'
import { FormulaireEtablissement } from '../../formulaires'

export default async function ModifierEtablissement({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const etablissement = await recupererEtablissementParId(id)
  if (!etablissement) notFound()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <Link href={`/etablissements/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Retour au détail
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Modifier l&apos;établissement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {etablissement.abreviation} — {etablissement.nom}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <FormulaireEtablissement
          action="modifier"
          etablissement={{
            id: etablissement.id,
            nom: etablissement.nom,
            abreviation: etablissement.abreviation,
            type: etablissement.type,
          }}
        />
      </div>
    </div>
  )
}
