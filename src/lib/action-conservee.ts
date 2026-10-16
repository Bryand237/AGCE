'use client'

import { startTransition, useActionState } from 'react'
import type { FormEvent } from 'react'

/**
 * Comme useActionState, mais le formulaire garde ce que l'utilisateur a saisi quand l'action
 * répond par une erreur.
 *
 * Avec <form action={...}>, React 19 réinitialise le formulaire dès que l'action se termine,
 * même si elle renvoie une erreur : tous les champs reviennent à leur valeur de départ, listes
 * déroulantes comprises (constaté dans Chromium avec React 19.2). Ici, l'action est lancée
 * depuis onSubmit, dans une transition : React ne réinitialise rien.
 *
 * Usage :
 *
 *   const [state, surEnvoi, isPending] = useActionConservee(actionServeur, etatInitial)
 *   ...
 *   <form method="post" onSubmit={surEnvoi}>
 *
 * (`method="post"` : si le formulaire est envoyé avant la fin du chargement de la page, les
 * champs ne se retrouvent pas dans l'adresse.)
 *
 * À réserver aux formulaires qui quittent la page quand ils réussissent (redirect). Un
 * formulaire qui reste affiché après un succès, comme l'ajout d'un département, a au
 * contraire besoin de la réinitialisation pour se vider : il garde <form action={...}>.
 */
export function useActionConservee<Etat>(
  action: (etat: Awaited<Etat>, donnees: FormData) => Etat | Promise<Etat>,
  etatInitial: Awaited<Etat>
) {
  const [etat, lancer, enCours] = useActionState(action, etatInitial)

  function surEnvoi(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    // Le bouton qui a déclenché l'envoi est transmis : son name/value fait partie des données.
    const envoyeur = (evenement.nativeEvent as SubmitEvent).submitter
    const donnees = new FormData(evenement.currentTarget, envoyeur)
    startTransition(() => lancer(donnees))
  }

  return [etat, surEnvoi, enCours] as const
}
