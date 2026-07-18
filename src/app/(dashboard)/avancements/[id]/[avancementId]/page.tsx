import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { recupererAvancementDetail } from '../../donnees'
import { formaterPosition } from '@/domain/avancement/formaterPosition'
import { BlocDecision } from './formulaires'

export default async function DetailAvancement({
  params,
}: {
  params: Promise<{ id: string; avancementId: string }>
}) {
  const { id, avancementId } = await params
  const avancement = await recupererAvancementDetail(id, avancementId)
  if (!avancement) notFound()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <Link
          href={`/avancements/${id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Retour au rapport
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          {avancement.enseignant.nom} {avancement.enseignant.prenom}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formaterPosition(avancement.anciennePosition)} (indice {avancement.anciennePosition.indice})
          {' → '}
          {formaterPosition(avancement.nouvellePosition)} (indice {avancement.nouvellePosition.indice}),
          pour compter du {avancement.dateNouvelEffet.toLocaleDateString('fr-FR')}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-foreground">Décision d&apos;avancement</h2>
        <BlocDecision
          id={id}
          avancementId={avancementId}
          statutDecision={avancement.statutDecision}
          numeroDecision={avancement.numeroDecision}
        />
      </div>
    </div>
  )
}
