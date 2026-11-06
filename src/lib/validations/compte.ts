import { z } from 'zod'
import './champs'

/** Longueur minimale d'un nouveau mot de passe. */
export const MOT_DE_PASSE_MIN = 8
/** bcrypt ignore tout ce qui dépasse 72 octets : au-delà, deux mots de passe différents seraient équivalents. */
export const MOT_DE_PASSE_MAX_OCTETS = 72

const MOT_DE_PASSE_ACTUEL = z.string().min(1, 'Saisissez votre mot de passe actuel.')

/** Un champ vide du formulaire (« ne pas changer le mot de passe ») vaut `undefined`. */
const motDePasseFacultatif = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))

export const ModificationIdentifiantsSchema = z
  .object({
    motDePasseActuel: MOT_DE_PASSE_ACTUEL,
    nomUtilisateur: z
      .string()
      .trim()
      .min(3, "L'identifiant doit compter au moins 3 caractères.")
      .max(50, "L'identifiant ne peut pas dépasser 50 caractères.")
      .regex(
        /^[\p{L}\p{N}._@-]+$/u,
        "L'identifiant ne peut contenir que des lettres, des chiffres et . _ @ -"
      ),
    nouveauMotDePasse: motDePasseFacultatif,
    confirmation: motDePasseFacultatif,
  })
  .superRefine((saisie, contexte) => {
    const nouveau = saisie.nouveauMotDePasse
    if (nouveau === undefined) {
      if (saisie.confirmation !== undefined) {
        contexte.addIssue({
          code: 'custom',
          path: ['nouveauMotDePasse'],
          message: 'Saisissez le nouveau mot de passe, ou videz aussi la confirmation.',
        })
      }
      return
    }
    if (nouveau.length < MOT_DE_PASSE_MIN) {
      contexte.addIssue({
        code: 'custom',
        path: ['nouveauMotDePasse'],
        message: `Le mot de passe doit compter au moins ${MOT_DE_PASSE_MIN} caractères.`,
      })
    } else if (Buffer.byteLength(nouveau, 'utf8') > MOT_DE_PASSE_MAX_OCTETS) {
      contexte.addIssue({
        code: 'custom',
        path: ['nouveauMotDePasse'],
        message: `Le mot de passe est trop long (${MOT_DE_PASSE_MAX_OCTETS} octets au plus).`,
      })
    }
    if (saisie.confirmation !== nouveau) {
      contexte.addIssue({
        code: 'custom',
        path: ['confirmation'],
        message: 'La confirmation est différente du nouveau mot de passe.',
      })
    }
  })

export const RetablissementIdentifiantsSchema = z.object({
  motDePasseActuel: MOT_DE_PASSE_ACTUEL,
})
