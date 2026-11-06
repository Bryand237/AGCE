import { describe, expect, it } from 'vitest'
import {
  cleLimite,
  creerLimiteTentatives,
  FENETRE_MS,
  messageBlocage,
  TENTATIVES_MAX,
} from './limite-tentatives'

const MINUTE = 60_000

/** Une limite dont l'horloge est pilotée par le test. */
function limiteAvecHorloge(options: { max?: number; fenetreMs?: number } = {}) {
  const horloge = { t: 1_000_000 }
  const limite = creerLimiteTentatives({ ...options, maintenant: () => horloge.t })
  return { limite, horloge }
}

describe('limite des tentatives de connexion', () => {
  it('fixe la règle de l’audit : 5 essais par 5 minutes', () => {
    expect(TENTATIVES_MAX).toBe(5)
    expect(FENETRE_MS).toBe(5 * MINUTE)
  })

  it('laisse passer jusqu’à cinq essais, puis bloque le sixième', () => {
    const { limite } = limiteAvecHorloge()

    for (let essai = 1; essai <= 5; essai++) {
      expect(limite.verifier('mbala')).toEqual({ bloque: false })
      limite.compter('mbala')
    }

    expect(limite.verifier('mbala').bloque).toBe(true)
  })

  it('indique dans combien de temps le plus ancien essai sort de la fenêtre', () => {
    const { limite, horloge } = limiteAvecHorloge()
    for (let essai = 0; essai < 5; essai++) {
      limite.compter('mbala')
      horloge.t += 10_000 // un essai toutes les 10 s : le premier date de 40 s
    }
    // Premier essai à t0, maintenant t0 + 50 s : il sort de la fenêtre à t0 + 5 min.
    expect(limite.verifier('mbala')).toEqual({ bloque: true, reessayerDansMs: 5 * MINUTE - 50_000 })
  })

  it('libère l’identifiant quand le plus ancien essai sort de la fenêtre', () => {
    const { limite, horloge } = limiteAvecHorloge()
    for (let essai = 0; essai < 5; essai++) limite.compter('mbala')

    horloge.t += 5 * MINUTE - 1
    expect(limite.verifier('mbala').bloque).toBe(true)

    horloge.t += 1
    expect(limite.verifier('mbala')).toEqual({ bloque: false })
  })

  it('compte dans une fenêtre glissante : les essais anciens ne comptent plus', () => {
    const { limite, horloge } = limiteAvecHorloge()
    for (let essai = 0; essai < 4; essai++) limite.compter('mbala')

    horloge.t += 5 * MINUTE // les quatre premiers sont sortis
    limite.compter('mbala')
    expect(limite.verifier('mbala')).toEqual({ bloque: false })
  })

  it('ne prolonge pas le blocage quand on insiste : seuls les essais autorisés sont comptés', () => {
    const { limite, horloge } = limiteAvecHorloge()
    for (let essai = 0; essai < 5; essai++) limite.compter('mbala')

    // Le blocage se lit sans rien modifier : les requêtes refusées ne repoussent pas l'échéance.
    horloge.t += 2 * MINUTE
    const avant = limite.verifier('mbala')
    limite.verifier('mbala')
    limite.verifier('mbala')
    expect(limite.verifier('mbala')).toEqual(avant)
  })

  it('suit chaque identifiant séparément', () => {
    const { limite } = limiteAvecHorloge()
    for (let essai = 0; essai < 5; essai++) limite.compter('mbala')

    expect(limite.verifier('mbala').bloque).toBe(true)
    expect(limite.verifier('autre')).toEqual({ bloque: false })
  })

  it('efface le compteur d’un identifiant à la connexion réussie', () => {
    const { limite } = limiteAvecHorloge()
    for (let essai = 0; essai < 4; essai++) limite.compter('mbala')

    limite.reinitialiser('mbala')

    for (let essai = 0; essai < 4; essai++) limite.compter('mbala')
    expect(limite.verifier('mbala')).toEqual({ bloque: false })
  })

  it('oublie les identifiants dont plus aucun essai n’est récent (la mémoire ne grossit pas)', () => {
    const { limite, horloge } = limiteAvecHorloge()
    limite.compter('a')
    limite.compter('b')
    expect(limite.taille()).toBe(2)

    horloge.t += 5 * MINUTE
    limite.verifier('a')
    limite.verifier('b')
    expect(limite.taille()).toBe(0)
  })

  it('borne le nombre d’identifiants suivis face à des noms tirés au hasard', () => {
    const { limite } = limiteAvecHorloge()
    for (let n = 0; n < 5000; n++) limite.compter(`inconnu-${n}`)

    expect(limite.taille()).toBeLessThanOrEqual(1000)
    // Les plus récents sont ceux qu'on a gardés.
    limite.compter('inconnu-4999')
    expect(limite.taille()).toBeLessThanOrEqual(1000)
  })

  it('accepte un autre réglage', () => {
    const { limite } = limiteAvecHorloge({ max: 2, fenetreMs: MINUTE })
    limite.compter('x')
    limite.compter('x')
    expect(limite.verifier('x').bloque).toBe(true)
  })
})

describe('cleLimite', () => {
  it('ignore la casse et les espaces autour : MBALA et mbala partagent le même budget', () => {
    expect(cleLimite('  MBALA ')).toBe('mbala')
    expect(cleLimite('mbala')).toBe('mbala')
  })
})

describe('messageBlocage', () => {
  it('arrondit à la minute supérieure', () => {
    expect(messageBlocage(4 * MINUTE + 1)).toBe(
      'Trop de tentatives de connexion. Réessayez dans 5 minutes.'
    )
    expect(messageBlocage(2 * MINUTE)).toBe(
      'Trop de tentatives de connexion. Réessayez dans 2 minutes.'
    )
  })

  it('écrit « 1 minute » au singulier, et jamais « 0 minute »', () => {
    expect(messageBlocage(MINUTE)).toBe('Trop de tentatives de connexion. Réessayez dans 1 minute.')
    expect(messageBlocage(500)).toBe('Trop de tentatives de connexion. Réessayez dans 1 minute.')
  })
})
