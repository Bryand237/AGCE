'use client'

import { useState } from 'react'
import { creerAbsence, type EtatFormulaire } from './actions'
import { useActionConservee } from '@/lib/action-conservee'
import { classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'
import { ChampsMission } from './champs-mission'

const etatInitial: EtatFormulaire = {}

export function FormulaireAbsence({
  enseignants,
}: {
  enseignants: Array<{ id: string; nom: string; prenom: string; matricule: string }>
}) {
  const [state, surEnvoi, isPending] = useActionConservee(creerAbsence, etatInitial)
  const [type, setType] = useState('CONGE_MATERNITE')

  return (
    <form method="post" onSubmit={surEnvoi} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Enseignant
        <select name="matricule" required className={classeChamp} defaultValue="">
          <option value="" disabled>
            Sélectionner un enseignant
          </option>
          {enseignants.map((enseignant) => (
            <option key={enseignant.id} value={enseignant.matricule}>
              {enseignant.nom} {enseignant.prenom} — {enseignant.matricule}
            </option>
          ))}
        </select>
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
        <p className="text-muted-foreground text-sm">
          Date de fin calculée automatiquement (14 semaines), modifiable ensuite.
        </p>
      )}
      {type === 'MISSION' && <ChampsMission />}
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Création...' : "Créer l'absence"}
      </button>
    </form>
  )
}
