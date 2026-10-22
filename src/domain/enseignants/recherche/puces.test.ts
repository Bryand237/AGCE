import { describe, expect, it } from 'vitest'
import { filtresVides } from './filtres'
import { lireFiltres } from './lireFiltres'
import { adresseSansPuce, decrirePuces, libelleCritereDate, libelleCritereEcheance } from './puces'
import type { ReferentielsFiltres } from './puces'
import { jour } from './dossiersDeTest'

const REF: ReferentielsFiltres = {
  etablissements: [{ id: 'e1', nom: 'Faculté des Sciences', abreviation: 'FS' }],
  departements: [{ id: 'd1', nom: 'Département de Chimie', etablissementId: 'e1' }],
  regions: [{ id: 'r1', nom: 'Extrême-Nord' }],
  departementsOrigine: [{ id: 'o1', nom: 'Diamaré', regionId: 'r1' }],
}

describe('libelleCritereDate', () => {
  it('décrit une année, une plage, une borne', () => {
    expect(libelleCritereDate({ annee: 1970 })).toBe('1970')
    expect(libelleCritereDate({ du: jour('2027-01-01'), au: jour('2027-06-30') })).toBe(
      'du 01/01/2027 au 30/06/2027'
    )
    expect(libelleCritereDate({ du: jour('2027-01-01') })).toBe('à partir du 01/01/2027')
    expect(libelleCritereDate({ au: jour('2027-06-30') })).toBe("jusqu'au 30/06/2027")
    expect(libelleCritereDate({ annee: 2027, du: jour('2027-03-01') })).toBe(
      '2027 · à partir du 01/03/2027'
    )
    expect(libelleCritereDate({})).toBe('')
  })
})

describe('decrirePuces', () => {
  it('aucune puce sans filtre', () => {
    expect(decrirePuces(filtresVides(), REF)).toEqual([])
  })

  it('ne tient pas compte du tri ni de la page', () => {
    expect(decrirePuces(lireFiltres({ trier: 'grade', ordre: 'desc', page: '4' }), REF)).toEqual([])
  })

  it('décrit chaque filtre avec les noms lisibles', () => {
    const puces = decrirePuces(
      lireFiltres({
        recherche: 'alice',
        statut: ['ACTIF', 'RETRAITE'],
        grade: 'ASSISTANT',
        sexe: 'F',
        etablissement: 'e1',
        departement: 'd1',
        region: 'r1',
        origine: 'o1',
        resident: 'oui',
        collaboration: 'non',
        responsabilite: 'oui',
        classe: '2',
        echelon: '3',
        indiceMin: '900',
        indiceMax: '1300',
        naissanceAnnee: '1970',
        priseServiceDu: '2000-01-01',
      }),
      REF
    )
    expect(puces.map((p) => p.libelle)).toEqual([
      'Recherche : « alice »',
      'Statut : Actif, Retraité',
      'Grade : Assistant',
      'Genre : Féminin',
      'Établissement : FS',
      'Département : Département de Chimie',
      "Région d'origine : Extrême-Nord",
      "Département d'origine : Diamaré",
      'Résident : oui',
      'Contrat de collaboration : non',
      'Poste de responsabilité : oui',
      'Classe : 2',
      'Échelon : 3',
      'Indice : 900 à 1300',
      'Naissance : 1970',
      'Prise de service : à partir du 01/01/2000',
    ])
  })

  it('décrit une borne d’indice seule', () => {
    expect(decrirePuces(lireFiltres({ indiceMin: '900' }), REF)[0]?.libelle).toBe(
      'Indice : au moins 900'
    )
    expect(decrirePuces(lireFiltres({ indiceMax: '900' }), REF)[0]?.libelle).toBe(
      'Indice : au plus 900'
    )
  })

  it('signale un identifiant qui ne désigne plus rien', () => {
    const puces = decrirePuces(lireFiltres({ etablissement: 'supprime' }), REF)
    expect(puces[0]?.libelle).toBe('Établissement : introuvable')
  })
})

describe('adresseSansPuce', () => {
  it('retire uniquement le filtre de la puce et revient à la première page', () => {
    const filtres = lireFiltres({
      sexe: 'F',
      grade: 'ASSISTANT',
      naissanceAnnee: '1970',
      naissanceDu: '1970-01-01',
      page: '3',
      trier: 'grade',
    })
    const puces = decrirePuces(filtres, REF)
    const naissance = puces.find((p) => p.libelle.startsWith('Naissance'))!
    expect(adresseSansPuce(filtres, naissance)).toBe(
      '/enseignants?grade=ASSISTANT&sexe=F&trier=grade'
    )
    const sexe = puces.find((p) => p.libelle.startsWith('Genre'))!
    expect(adresseSansPuce(filtres, sexe)).toBe(
      '/enseignants?grade=ASSISTANT&naissanceAnnee=1970&naissanceDu=1970-01-01&trier=grade'
    )
  })

  it('renvoie l’adresse nue quand la dernière puce est retirée', () => {
    const filtres = lireFiltres({ sexe: 'F' })
    expect(adresseSansPuce(filtres, decrirePuces(filtres, REF)[0]!)).toBe('/enseignants')
  })
})

describe('puces — retraite et avancement', () => {
  it('décrit l’échéance, avec l’année ou la plage quand il y en a', () => {
    expect(libelleCritereEcheance({})).toBe('')
    expect(libelleCritereEcheance({ echeance: 'passee' })).toBe('déjà passée')
    expect(libelleCritereEcheance({ echeance: 'future', annee: 2028 })).toBe('à venir · 2028')
    expect(libelleCritereEcheance({ annee: 2028 })).toBe('2028')
  })

  it('une puce par critère, qui retire tous ses paramètres et eux seuls', () => {
    const filtres = lireFiltres({
      retraiteEcheance: 'passee',
      retraiteAnnee: '2025',
      avancementEcheance: 'future',
      sexe: 'F',
    })
    const puces = decrirePuces(filtres, REF)
    expect(puces.map((p) => p.libelle)).toEqual([
      'Genre : Féminin',
      'Date de retraite : déjà passée · 2025',
      'Date d’avancement : à venir',
    ])
    const retraite = puces.find((p) => p.libelle.startsWith('Date de retraite'))!
    expect(adresseSansPuce(filtres, retraite)).toBe('/enseignants?sexe=F&avancementEcheance=future')
  })
})
