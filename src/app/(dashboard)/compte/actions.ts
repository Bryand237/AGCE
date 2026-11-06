'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { exigerUtilisateur, recupererUtilisateurConnecte } from '@/lib/auth'
import { messageErreur } from '@/lib/erreurs'
import { erreursDeSaisie } from '@/lib/validations/champs'
import {
  ModificationIdentifiantsSchema,
  RetablissementIdentifiantsSchema,
} from '@/lib/validations/compte'
import {
  appliquerIdentifiants,
  identifiantsInitiaux,
  motDePasseCorrect,
} from '@/lib/comptes/identifiants'
import type { EtatFormulaire } from '@/lib/formulaires'

const MOT_DE_PASSE_INCORRECT = 'Le mot de passe actuel est incorrect.'
const COMPTE_DISPARU = "Ce compte n'existe plus : reconnectez-vous."
const IDENTIFIANT_PRIS = 'Cet identifiant est déjà utilisé par un autre compte.'

/**
 * Le compte de la session, que `exigerUtilisateur()` vient de vérifier : chaque action commence
 * par cette garde, seule forme que le test `actions-protegees.test.ts` reconnaît, puis relit le
 * compte ici (une lecture de plus, sans conséquence pour une page de réglages).
 */
async function compteDeLaSession() {
  const utilisateur = await recupererUtilisateurConnecte()
  if (!utilisateur) redirect('/connexion')
  return utilisateur
}

/**
 * Modifie l'identifiant et/ou le mot de passe du compte connecté.
 *
 * Le mot de passe actuel est exigé À CHAQUE FOIS : une session laissée ouverte sur un poste ne
 * suffit pas pour prendre le compte. Quand le mot de passe change, les autres sessions du
 * compte sont fermées ; celle de la personne qui vient de le changer reste ouverte.
 */
export async function modifierIdentifiants(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const utilisateur = await compteDeLaSession()
  const parsed = ModificationIdentifiantsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)
  const { motDePasseActuel, nomUtilisateur, nouveauMotDePasse } = parsed.data

  if (!(await motDePasseCorrect(motDePasseActuel, utilisateur.motDePasseHash))) {
    return {
      errors: { motDePasseActuel: [MOT_DE_PASSE_INCORRECT] },
      message: MOT_DE_PASSE_INCORRECT,
    }
  }
  if (nomUtilisateur === utilisateur.nomUtilisateur && nouveauMotDePasse === undefined) {
    return {
      message: 'Rien à modifier : saisissez un autre identifiant ou un nouveau mot de passe.',
    }
  }

  const jetonAConserver = (await cookies()).get('session')?.value
  try {
    await appliquerIdentifiants(
      prisma,
      utilisateur.id,
      { nomUtilisateur, motDePasse: nouveauMotDePasse },
      { jetonAConserver }
    )
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'modifierIdentifiants', {
        unicite: IDENTIFIANT_PRIS,
        introuvable: COMPTE_DISPARU,
      }),
    }
  }

  // Le nom du compte s'affiche dans l'en-tête de toutes les pages.
  revalidatePath('/', 'layout')
  return {
    message:
      nouveauMotDePasse === undefined
        ? 'Identifiant enregistré.'
        : 'Identifiants enregistrés. Les autres sessions ouvertes sur ce compte ont été fermées.',
    succes: true,
  }
}

/**
 * Remet l'identifiant et le mot de passe du compte connecté à ceux du fichier `.env`
 * (ADMIN_USERNAME, ADMIN_PASSWORD) : ceux de l'installation. Toutes les sessions sont fermées,
 * y compris celle-ci : la personne se reconnecte aussitôt avec les identifiants initiaux, ce qui
 * prouve qu'ils fonctionnent.
 *
 * Pour qui a oublié ses identifiants et ne peut donc plus ouvrir cette page :
 * `npm run admin:reset`, qui fait la même chose depuis un terminal.
 */
export async function retablirIdentifiantsInitiaux(
  _prevState: EtatFormulaire,
  formData: FormData
): Promise<EtatFormulaire> {
  await exigerUtilisateur()
  const utilisateur = await compteDeLaSession()
  const parsed = RetablissementIdentifiantsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return erreursDeSaisie(parsed.error)

  if (!(await motDePasseCorrect(parsed.data.motDePasseActuel, utilisateur.motDePasseHash))) {
    return {
      errors: { motDePasseActuel: [MOT_DE_PASSE_INCORRECT] },
      message: MOT_DE_PASSE_INCORRECT,
    }
  }
  const initiaux = identifiantsInitiaux()
  if (!initiaux) {
    return {
      message:
        "Les identifiants initiaux (ADMIN_USERNAME et ADMIN_PASSWORD) ne figurent pas dans le fichier .env : rien n'a été modifié.",
    }
  }

  try {
    await appliquerIdentifiants(prisma, utilisateur.id, initiaux)
  } catch (erreur) {
    return {
      message: messageErreur(erreur, 'retablirIdentifiantsInitiaux', {
        unicite: IDENTIFIANT_PRIS,
        introuvable: COMPTE_DISPARU,
      }),
    }
  }

  ;(await cookies()).delete('session')
  redirect('/connexion?initiaux=1')
}
