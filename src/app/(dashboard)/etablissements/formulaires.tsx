'use client'

import { useActionState } from 'react'
import {
  creerEtablissement,
  modifierEtablissement,
  creerDepartement,
  supprimerEtablissement,
  type EtatFormulaire,
} from './actions'
import {
  classeBoutonDanger,
  classeBoutonPrimaire,
  classeChamp,
  classeFormulaire,
} from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

type EtablissementExistant = {
  id: string
  nom: string
  abreviation: string
  type: 'ECOLE' | 'FACULTE'
}

export function FormulaireEtablissement({
  action,
  etablissement,
}: {
  action: 'creer' | 'modifier'
  etablissement?: EtablissementExistant
}) {
  const actionServeur =
    action === 'creer'
      ? creerEtablissement
      : modifierEtablissement.bind(null, etablissement!.id)
  const [state, formAction, isPending] = useActionState(actionServeur, etatInitial)

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nom
        <input name="nom" required defaultValue={etablissement?.nom} className={classeChamp} />
        {state.errors?.nom && <p className="text-destructive text-sm">{state.errors.nom[0]}</p>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Abréviation
        <input
          name="abreviation"
          required
          defaultValue={etablissement?.abreviation}
          className={`${classeChamp} uppercase`}
        />
        {state.errors?.abreviation && (
          <p className="text-destructive text-sm">{state.errors.abreviation[0]}</p>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Type
        <select name="type" required defaultValue={etablissement?.type ?? ''} className={classeChamp}>
          <option value="">Choisir un type</option>
          <option value="ECOLE">École</option>
          <option value="FACULTE">Faculté</option>
        </select>
        {state.errors?.type && <p className="text-destructive text-sm">{state.errors.type[0]}</p>}
      </label>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Enregistrement...' : action === 'creer' ? 'Créer' : 'Enregistrer'}
      </button>
    </form>
  )
}

export function FormulaireDepartement({ etablissementId }: { etablissementId: string }) {
  const [state, formAction, isPending] = useActionState(creerDepartement, etatInitial)

  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-sm font-semibold text-foreground">Ajouter un département</p>
      <input type="hidden" name="etablissementId" value={etablissementId} />

      <label className="flex flex-col gap-1 text-sm">
        Nom
        <input name="nom" required className={classeChamp} />
        {state.errors?.nom && <p className="text-destructive text-sm">{state.errors.nom[0]}</p>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Abréviation
        <input name="abreviation" required className={`${classeChamp} uppercase`} />
        {state.errors?.abreviation && (
          <p className="text-destructive text-sm">{state.errors.abreviation[0]}</p>
        )}
      </label>

      {state.message && (
        <p className={`text-sm ${state.message === 'Département ajouté.' ? 'text-primary' : 'text-destructive'}`}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Ajout...' : 'Ajouter le département'}
      </button>
    </form>
  )
}

export function BoutonSupprimerEtablissement({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(
    supprimerEtablissement.bind(null, id),
    etatInitial
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm('Supprimer définitivement cet établissement ?')) e.preventDefault()
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
      {state.message && <p className="text-destructive mb-2 text-sm">{state.message}</p>}
      <button type="submit" disabled={isPending} className={classeBoutonDanger}>
        {isPending ? 'Suppression...' : "Supprimer l'établissement"}
      </button>
    </form>
  )
}
