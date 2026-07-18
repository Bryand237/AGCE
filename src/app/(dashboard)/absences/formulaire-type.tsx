'use client'

import { useState, useActionState } from 'react'
import { creerAbsence, type EtatFormulaire } from './actions'
import { classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

export function FormulaireAbsence() {
  const [state, formAction, isPending] = useActionState(creerAbsence, etatInitial)
  const [type, setType] = useState('CONGE_MATERNITE')

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Matricule de l&apos;enseignant
        <input name="matricule" required className={classeChamp} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type d&apos;absence
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={classeChamp}
        >
          <option value="CONGE_MATERNITE">Congé de maternité</option>
          <option value="CONGE_MALADIE">Congé de maladie</option>
          <option value="MISSION">Mission</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Date de début
        <input type="date" name="dateDebut" required className={classeChamp} />
      </label>
      {type !== 'CONGE_MATERNITE' ? (
        <label className="flex flex-col gap-1 text-sm">
          Date de fin
          <input type="date" name="dateFin" required className={classeChamp} />
        </label>
      ) : (
        <p className="text-sm text-muted-foreground">
          Date de fin calculée automatiquement (14 semaines), modifiable ensuite.
        </p>
      )}
      {type === 'MISSION' && (
        <label className="flex flex-col gap-1 text-sm">
          Motif
          <textarea name="motif" rows={3} className={classeChamp} />
        </label>
      )}
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Création...' : "Créer l'absence"}
      </button>
    </form>
  )
}
