/**
 * Limite des tentatives de connexion : au plus `TENTATIVES_MAX` essais par identifiant dans une
 * fenêtre glissante de `FENETRE_MS`. Au-delà, la connexion est refusée sans même vérifier le mot
 * de passe, jusqu'à ce que le plus ancien essai sorte de la fenêtre.
 *
 * Le compteur vit dans la mémoire du serveur : il n'ajoute aucune table (le schéma Prisma ne
 * change pas) et redémarre à zéro avec l'application, ce qui est acceptable ici : l'application
 * tourne en un seul processus, et un redémarrage exige déjà d'avoir la main sur le poste.
 *
 * Choix assumé : la limite porte sur l'identifiant, pas sur l'adresse du visiteur. Derrière un
 * serveur local, l'adresse n'est pas fiable (tous les postes arrivent par la même passerelle, ou
 * l'en-tête est falsifiable). Contrepartie : quelqu'un qui connaît l'identifiant peut le bloquer
 * cinq minutes en se trompant exprès ; il ne peut pas deviner le mot de passe pour autant.
 */

export const TENTATIVES_MAX = 5
export const FENETRE_MS = 5 * 60 * 1000

/** Identifiants distincts suivis en même temps : borne la mémoire face à des noms au hasard. */
const IDENTIFIANTS_SUIVIS_MAX = 1000

export type Verdict = { bloque: false } | { bloque: true; reessayerDansMs: number }

type Options = {
  max?: number
  fenetreMs?: number
  /** Horloge (millisecondes) : remplaçable dans les tests. */
  maintenant?: () => number
}

export function creerLimiteTentatives({
  max = TENTATIVES_MAX,
  fenetreMs = FENETRE_MS,
  maintenant = () => Date.now(),
}: Options = {}) {
  // Pour chaque identifiant, les dates (croissantes) de ses tentatives récentes.
  const journal = new Map<string, number[]>()

  function recentes(cle: string, t: number): number[] {
    const liste = (journal.get(cle) ?? []).filter((date) => t - date < fenetreMs)
    if (liste.length > 0) journal.set(cle, liste)
    else journal.delete(cle)
    return liste
  }

  function elaguer(t: number) {
    if (journal.size <= IDENTIFIANTS_SUIVIS_MAX) return
    for (const cle of [...journal.keys()]) recentes(cle, t)
    // Toujours trop : on oublie les plus anciens (l'ordre d'une Map est celui des insertions).
    for (const cle of journal.keys()) {
      if (journal.size <= IDENTIFIANTS_SUIVIS_MAX) break
      journal.delete(cle)
    }
  }

  return {
    /** Cet identifiant peut-il tenter de se connecter maintenant ? Ne modifie rien. */
    verifier(cle: string): Verdict {
      const t = maintenant()
      const liste = recentes(cle, t)
      const plusAncien = liste[0]
      if (plusAncien === undefined || liste.length < max) return { bloque: false }
      return { bloque: true, reessayerDansMs: plusAncien + fenetreMs - t }
    },

    /**
     * Compte une tentative. À appeler AVANT de vérifier le mot de passe : plusieurs requêtes
     * lancées ensemble sont ainsi toutes comptées, avant que la première ait fini. Une
     * connexion réussie efface ensuite le compteur (`reinitialiser`).
     */
    compter(cle: string) {
      const t = maintenant()
      const liste = recentes(cle, t)
      journal.set(cle, [...liste, t])
      elaguer(t)
    },

    /** Efface le compteur d'un identifiant (connexion réussie). */
    reinitialiser(cle: string) {
      journal.delete(cle)
    },

    /** Oublie tout (tests). */
    vider() {
      journal.clear()
    },

    /** Nombre d'identifiants suivis (tests). */
    taille() {
      return journal.size
    },
  }
}

/**
 * Clé de limite d'un identifiant : sans tenir compte de la casse ni des espaces autour, pour
 * que « MBALA » et « mbala » partagent le même budget d'essais.
 */
export function cleLimite(nomUtilisateur: string): string {
  return nomUtilisateur.trim().toLowerCase()
}

/** « Réessayez dans 3 minutes. » : arrondi à la minute supérieure, au moins une. */
export function messageBlocage(reessayerDansMs: number): string {
  const minutes = Math.max(1, Math.ceil(reessayerDansMs / 60_000))
  return `Trop de tentatives de connexion. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
}

// Une seule instance pour tout le serveur. Sans ce détour par `globalThis`, le rechargement à
// chaud de `next dev` recréerait le module, donc le compteur, à chaque sauvegarde (même raison
// que pour le client Prisma, voir lib/prisma.ts).
const partage = globalThis as unknown as {
  limiteConnexions?: ReturnType<typeof creerLimiteTentatives>
}

export const limiteConnexions = (partage.limiteConnexions ??= creerLimiteTentatives())
