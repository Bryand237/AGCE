import { z } from 'zod'

// Un <input> laissé vide envoie une chaîne vide en FormData, jamais
// "absent" — .optional() seul ne suffit donc pas à obtenir `undefined`
// en base. Ce petit helper uniformise le traitement déjà appliqué "à la
// main" au champ email, pour les autres champs texte optionnels.
const texteOptionnel = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))

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

export const EnseignantSchema = z.object({
  matricule: z.string().min(1, 'Le matricule est obligatoire'),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().min(1, 'Le prénom est obligatoire'),
  sexe: z.enum(['M', 'F']),
  dateNaissance: z.coerce.date(),
  lieuNaissance: z.string().min(1),
  diplomePlusEleve: texteOptionnel,
  domaineRecherche: texteOptionnel,
  datePriseService: z.coerce.date(),
  // z.coerce.boolean() est un piège ici : Boolean("false") vaut true en JS
  // (toute chaîne non vide est "truthy"), donc un <select> à valeurs
  // "true"/"false" s'enregistrerait toujours comme true. On force des
  // valeurs explicites qui collent au "(Oui/Non)" du document de référence.
  estResident: z.enum(['oui', 'non']).transform((v) => v === 'oui'),
  contratCollaboration: z.enum(['oui', 'non']).transform((v) => v === 'oui'),
  posteResponsabilite: texteOptionnel,
  telephone: texteOptionnel,
  email: z.string().email().optional().or(z.literal('')),

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
  dateEffetEchelon: z.coerce.date(),
})

export type EnseignantInput = z.infer<typeof EnseignantSchema>

export const TransfertSchema = z.object({
  dateFinService: z.coerce.date(),
  lieuTransfert: z.string().min(1, 'Le lieu de destination est obligatoire'),
  observations: z.string().optional(),
})

export const RetraiteSchema = z.object({
  dateFinService: z.coerce.date(),
  observations: z.string().optional(),
})
