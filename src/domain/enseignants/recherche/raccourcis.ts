import { anneeDe } from '../../dates/jourCivil'
import { critereAbsenceNeutre, filtresVides } from './filtres'
import type { FiltresEnseignants } from './filtres'
import { adresseListe, versParametres } from './versParametres'

/**
 * Un raccourci est une recherche toute faite, un clic sur la page des enseignants : « retraite
 * dépassée », « retraite en 2027 », « avancement échu »… Ce n'est RIEN de plus qu'un ensemble de
 * filtres : il passe par la même adresse, le même moteur et les mêmes puces que ce que
 * l'utilisateur compose lui-même dans le panneau, et peut donc être affiné ensuite.
 */
export type Raccourci = {
  id: string
  libelle: string
  /** Phrase d'aide affichée au survol. */
  description: string
  groupe: 'retraite' | 'avancement' | 'absence' | 'statut'
  filtres: FiltresEnseignants
}

function filtresRaccourci(surcharge: Partial<FiltresEnseignants>): FiltresEnseignants {
  return { ...filtresVides(), ...surcharge }
}

/**
 * Les raccourcis proposés aujourd'hui. Les années suivent le jour courant : « Retraite 2026 » en
 * 2026, « Retraite 2027 » en 2027 — l'adresse du raccourci porte l'année en clair, une adresse
 * enregistrée garde donc toujours le même sens.
 */
export function raccourcisDisponibles(jour: Date): Raccourci[] {
  const annee = anneeDe(jour)
  return [
    {
      id: 'retraite-depassee',
      libelle: 'Retraite dépassée',
      description: 'Enseignants encore actifs dont la date de retraite est atteinte',
      groupe: 'retraite',
      filtres: filtresRaccourci({
        statuts: ['ACTIF'],
        retraite: { echeance: 'passee' },
        tri: 'retraite',
      }),
    },
    {
      id: 'retraite-annee',
      libelle: `Retraite ${annee}`,
      description: `Enseignants partis ou qui partent à la retraite en ${annee}`,
      groupe: 'retraite',
      filtres: filtresRaccourci({ retraite: { annee }, tri: 'retraite' }),
    },
    {
      id: 'retraite-annee-suivante',
      libelle: `Retraite ${annee + 1}`,
      description: `Enseignants qui partent à la retraite en ${annee + 1}`,
      groupe: 'retraite',
      filtres: filtresRaccourci({ retraite: { annee: annee + 1 }, tri: 'retraite' }),
    },
    {
      id: 'retraites',
      libelle: 'Retraités',
      description: 'Enseignants déjà passés à la retraite',
      groupe: 'statut',
      filtres: filtresRaccourci({ statuts: ['RETRAITE'], tri: 'retraite', ordre: 'desc' }),
    },
    {
      id: 'avancement-echu',
      libelle: 'Avancement échu',
      description: "Enseignants actifs dont la date d'avancement d'échelon est atteinte",
      groupe: 'avancement',
      filtres: filtresRaccourci({
        statuts: ['ACTIF'],
        avancement: { echeance: 'passee' },
        tri: 'avancement',
      }),
    },
    {
      id: 'avancement-annee',
      libelle: `Avancement ${annee}`,
      description: `Enseignants éligibles à l'échelon suivant en ${annee}`,
      groupe: 'avancement',
      filtres: filtresRaccourci({ avancement: { annee }, tri: 'avancement' }),
    },
    {
      id: 'avancement-annee-suivante',
      libelle: `Avancement ${annee + 1}`,
      description: `Enseignants éligibles à l'échelon suivant en ${annee + 1}`,
      groupe: 'avancement',
      filtres: filtresRaccourci({ avancement: { annee: annee + 1 }, tri: 'avancement' }),
    },
    {
      id: 'absents-en-cours',
      libelle: 'Absents en ce moment',
      description: 'Enseignants en mission ou en congé aujourd’hui',
      groupe: 'absence',
      filtres: filtresRaccourci({ absence: { ...critereAbsenceNeutre(), etats: ['en-cours'] } }),
    },
    {
      id: 'absences-a-venir',
      libelle: 'Absences à venir',
      description: 'Enseignants dont une mission ou un congé commence bientôt',
      groupe: 'absence',
      filtres: filtresRaccourci({ absence: { ...critereAbsenceNeutre(), etats: ['a-venir'] } }),
    },
    {
      id: 'retours-non-enregistres',
      libelle: 'Retour non enregistré',
      description: 'Absences dont la fin prévue est passée sans retour enregistré',
      groupe: 'absence',
      filtres: filtresRaccourci({ absence: { ...critereAbsenceNeutre(), etats: ['depassee'] } }),
    },
  ]
}

export function adresseRaccourci(raccourci: Raccourci, chemin = '/enseignants'): string {
  return adresseListe(raccourci.filtres, chemin)
}

/**
 * Ce raccourci est-il celui qu'on est en train de regarder ? Oui quand tous ses filtres sont
 * présents et qu'aucun autre n'est ajouté. Le tri, le sens et la page ne comptent pas : on
 * peut retrier la liste d'un raccourci sans qu'il cesse d'être actif.
 */
export function raccourciActif(raccourci: Raccourci, filtres: FiltresEnseignants): boolean {
  const filtresSeuls = (f: FiltresEnseignants) => {
    const parametres = versParametres({ ...f, page: 1 })
    for (const cle of ['trier', 'ordre']) parametres.delete(cle)
    return parametres.toString()
  }
  return filtresSeuls(filtres) === filtresSeuls(raccourci.filtres)
}
