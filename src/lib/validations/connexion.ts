import { z } from 'zod'
import './champs'

/**
 * Ce qu'on accepte du formulaire de connexion. Aucune règle de contenu (un compte existant garde
 * son identifiant et son mot de passe, quels qu'ils soient) : on écarte seulement ce qui n'a pas
 * pu être saisi dans le formulaire, un champ absent (`null`) ou démesuré. Les bornes servent
 * aussi à ne pas garder en mémoire, dans le compteur de tentatives, un identifiant de plusieurs
 * mégaoctets envoyé à la main.
 */
export const IDENTIFIANT_MAX = 100
export const MOT_DE_PASSE_CONNEXION_MAX = 1000

export const SaisieConnexionSchema = z.object({
  nomUtilisateur: z.string().min(1).max(IDENTIFIANT_MAX),
  motDePasse: z.string().min(1).max(MOT_DE_PASSE_CONNEXION_MAX),
  // Une case à cocher n'envoie rien quand elle est décochée, et « on » quand elle est cochée.
  seSouvenir: z
    .string()
    .nullish()
    .transform((valeur) => valeur === 'on'),
})
