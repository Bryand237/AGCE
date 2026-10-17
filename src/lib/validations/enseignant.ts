import { z } from 'zod'
import { date, texteObligatoire, texteOptionnel } from './champs'

// Un <select> dont l'option « Non renseigné » a la valeur "" envoie une
// chaîne vide, jamais « absent » : z.string().uuid().optional() la refusait
// ("Invalid uuid") et le formulaire n'affichait aucune erreur. On traite
// donc "" comme « pas de valeur » et on renvoie null, ce qui permet aussi
// d'effacer la valeur d'une fiche existante (Prisma ignore undefined, mais
// écrit null).
const uuidOptionnel = (messageInvalide: string) =>
  z
    .preprocess((v) => (v === '' ? undefined : v), z.string().uuid(messageInvalide).optional())
    .transform((v) => v ?? null)

// Un e-mail vide (ou réduit à des espaces) est admis ; sinon il doit être valide.
const emailOptionnel = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z.string().email('Adresse e-mail invalide.').or(z.literal('')).optional()
)

export const EnseignantSchema = z
  .object({
    matricule: texteObligatoire('Le matricule est obligatoire'),
    nom: texteObligatoire('Le nom est obligatoire'),
    prenom: texteObligatoire('Le prénom est obligatoire'),
    sexe: z.enum(['M', 'F'], { errorMap: () => ({ message: 'Le sexe est obligatoire.' }) }),
    dateNaissance: date('La date de naissance'),
    lieuNaissance: texteObligatoire('Le lieu de naissance est obligatoire'),
    diplomePlusEleve: texteOptionnel,
    domaineRecherche: texteOptionnel,
    datePriseService: date('La date de prise de service'),
    // z.coerce.boolean() est un piège ici : Boolean("false") vaut true en JS
    // (toute chaîne non vide est "truthy"), donc un <select> à valeurs
    // "true"/"false" s'enregistrerait toujours comme true. On force des
    // valeurs explicites qui collent au "(Oui/Non)" du document de référence.
    estResident: z.enum(['oui', 'non']).transform((v) => v === 'oui'),
    contratCollaboration: z.enum(['oui', 'non']).transform((v) => v === 'oui'),
    posteResponsabilite: texteOptionnel,
    telephone: texteOptionnel,
    email: emailOptionnel,

    departementId: z.string().uuid("Le département d'affectation est obligatoire"),
    departementOrigineId: uuidOptionnel("Le département d'origine est invalide"),

    // Référence une ligne EchelonIndiciaire précise plutôt que de laisser
    // saisir classe/échelon/indice librement : impossible d'enregistrer une
    // combinaison qui n'existe pas dans la grille officielle. Le grade et
    // la voie ne sont PAS repris ici : on ne fait pas confiance à des
    // valeurs envoyées par le client pour ces champs dénormalisés — la
    // Server Action les redérive elle-même à partir de cette position,
    // après l'avoir validée en base.
    positionActuelleId: z.string().uuid('La position sur la grille est obligatoire'),
    dateEffetEchelon: date("La date d'effet de l'échelon"),
  })
  // Cohérence entre dates : une faute de frappe sur l'année (2099 pour 1999) fausserait l'âge
  // de retraite, l'éligibilité à l'avancement (date d'effet + 2 ans) et les listes imprimées.
  // Ces contrôles ne s'exécutent que si les trois dates sont lisibles.
  .superRefine((e, ctx) => {
    if (e.dateNaissance.getTime() > Date.now()) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateNaissance'],
        message: 'La date de naissance ne peut pas être dans le futur.',
      })
    }
    if (e.datePriseService.getTime() <= e.dateNaissance.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['datePriseService'],
        message: 'La prise de service doit être postérieure à la date de naissance.',
      })
    }
    if (e.dateEffetEchelon.getTime() < e.datePriseService.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateEffetEchelon'],
        message: "La date d'effet de l'échelon ne peut pas précéder la prise de service.",
      })
    }
  })

export type EnseignantInput = z.infer<typeof EnseignantSchema>

export const TransfertSchema = z.object({
  dateFinService: date('La date de fin de service'),
  lieuTransfert: texteObligatoire('Le lieu de destination est obligatoire'),
  observations: z.string().optional(),
})

export const RetraiteSchema = z.object({
  dateFinService: date('La date de fin de service'),
  observations: z.string().optional(),
})
