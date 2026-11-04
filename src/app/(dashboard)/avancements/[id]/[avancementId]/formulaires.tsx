'use client'

import { Alerte } from '@/components/ui/alerte'
import { useReussiteNotifiee } from '@/components/ui/notifications'
import { useActionState } from 'react'
import { genererDecision, validerDecision, type EtatFormulaireAvancement } from '../../actions'
import { useConfirmation } from '@/components/ui/confirmation'
import { Recapitulatif, dateEnClair, texteEnClair } from '@/components/ui/recapitulatif'
import { classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'

const etatInitial: EtatFormulaireAvancement = {}

export function BlocDecision({
  id,
  avancementId,
  statutDecision,
  numeroDecision,
}: {
  id: string
  avancementId: string
  statutDecision: string | null
  numeroDecision: string | null
}) {
  const [etatGeneration, formActionGenerer, enGeneration] = useActionState(
    useReussiteNotifiee(genererDecision.bind(null, avancementId)),
    etatInitial
  )
  const [state, formActionValider, isPending] = useActionState(
    useReussiteNotifiee(validerDecision.bind(null, avancementId)),
    etatInitial
  )
  // Une décision signée porte son numéro et sa date : elle ne peut plus être régénérée.
  const confirmation = useConfirmation({
    titre: 'Marquer cette décision comme signée ?',
    description:
      'Elle sera régénérée avec le numéro et la date de signature saisis, puis ne pourra plus être modifiée.',
    libelleConfirmer: 'Marquer signée',
    libelleEnCours: 'Enregistrement…',
    ton: 'avertissement',
    enCours: isPending,
    recapitulatif: (donnees) => (
      <Recapitulatif
        lignes={[
          { libelle: 'Numéro de décision', valeur: texteEnClair(donnees.get('numeroDecision')) },
          { libelle: 'Date de signature', valeur: dateEnClair(donnees.get('dateValidation')) },
          { libelle: 'Auteur', valeur: texteEnClair(donnees.get('auteurValidation')) },
        ]}
      />
    ),
  })

  if (!statutDecision) {
    return (
      <form action={formActionGenerer}>
        <button type="submit" className={classeBoutonPrimaire}>
          Générer le brouillon de décision
        </button>
      </form>
    )
  }
  if (statutDecision === 'EN_ATTENTE') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={`/avancements/${id}/${avancementId}/decision`}
            download
            className="text-sm font-medium text-primary hover:underline"
          >
            Télécharger le brouillon
          </a>
          {/* Après une modification des métadonnées du conseil : le brouillon enregistré garde
              les anciennes valeurs tant qu'il n'est pas régénéré. */}
          <form action={formActionGenerer}>
            <button
              type="submit"
              disabled={enGeneration}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
            >
              {enGeneration ? 'Génération...' : 'Régénérer le brouillon'}
            </button>
          </form>
          {etatGeneration.message && !etatGeneration.succes && (
            <Alerte ton="erreur">{etatGeneration.message}</Alerte>
          )}
        </div>
        <form
          action={formActionValider}
          onSubmit={confirmation.surEnvoi}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            Numéro de décision
            <input name="numeroDecision" required placeholder="0000123" className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Date de validation
            <input type="date" name="dateValidation" required className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Auteur de la validation
            <input name="auteurValidation" required className={classeChamp} />
          </label>
          {state.message && <Alerte ton="erreur">{state.message}</Alerte>}
          <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
            {isPending ? 'Enregistrement...' : 'Marquer signée'}
          </button>
        </form>
        {confirmation.dialogue}
      </div>
    )
  }
  return (
    <a
      href={`/avancements/${id}/${avancementId}/decision`}
      download
      className="text-sm font-medium text-primary hover:underline"
    >
      Télécharger la décision n°{numeroDecision}
    </a>
  )
}
