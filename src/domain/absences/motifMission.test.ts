import { describe, expect, it } from 'vitest'
import {
  composerMotifMission,
  erreurDetailsMission,
  lireMotifMission,
  motifAEnregistrer,
  motifMissionSurUneLigne,
} from './motifMission'

const LIEU = 'Université de Douala'
const OBJET = 'Participation au jury de soutenance de thèses'

describe('composerMotifMission', () => {
  it('met le lieu d’accueil puis l’objet, chacun sur sa ligne et avec son intitulé', () => {
    expect(composerMotifMission({ lieuAccueil: LIEU, objet: OBJET })).toBe(
      `Lieu d'accueil : ${LIEU}\nObjet : ${OBJET}`
    )
  })

  it('n’écrit que ce qui est renseigné', () => {
    expect(composerMotifMission({ lieuAccueil: LIEU, objet: '  ' })).toBe(
      `Lieu d'accueil : ${LIEU}`
    )
    expect(composerMotifMission({ objet: OBJET })).toBe(`Objet : ${OBJET}`)
  })

  it('ne renvoie rien quand rien n’est renseigné : le motif est alors vidé', () => {
    expect(composerMotifMission({})).toBeNull()
    expect(composerMotifMission({ lieuAccueil: ' ', objet: '' })).toBeNull()
  })

  it('ramène le lieu sur une ligne et garde les retours à la ligne de l’objet', () => {
    expect(
      composerMotifMission({ lieuAccueil: 'Université\n de   Douala ', objet: 'a\r\nb' })
    ).toBe("Lieu d'accueil : Université de Douala\nObjet : a\nb")
  })
})

describe('lireMotifMission', () => {
  it('relit exactement ce que composerMotifMission a écrit', () => {
    for (const details of [
      { lieuAccueil: LIEU, objet: OBJET },
      { lieuAccueil: LIEU, objet: '' },
      { lieuAccueil: '', objet: OBJET },
      { lieuAccueil: LIEU, objet: 'Ligne 1\nLigne 2' },
      { lieuAccueil: '', objet: '' },
    ]) {
      expect(lireMotifMission(composerMotifMission(details))).toEqual(details)
    }
  })

  it('lit un motif libre, écrit avant la convention, comme l’objet de la mission', () => {
    expect(lireMotifMission('Colloque international à Paris')).toEqual({
      lieuAccueil: '',
      objet: 'Colloque international à Paris',
    })
  })

  it('accepte l’apostrophe typographique, la casse et les fins de ligne Windows', () => {
    expect(lireMotifMission(`lieu d’accueil : ${LIEU}\r\nOBJET : ${OBJET}`)).toEqual({
      lieuAccueil: LIEU,
      objet: OBJET,
    })
  })

  it('ne prend pas pour un lieu une ligne qui n’est pas la première', () => {
    expect(lireMotifMission(`Colloque\nLieu d'accueil : ${LIEU}`)).toEqual({
      lieuAccueil: '',
      objet: `Colloque\nLieu d'accueil : ${LIEU}`,
    })
  })

  it('lit un motif absent ou vide comme « rien de renseigné »', () => {
    expect(lireMotifMission(null)).toEqual({ lieuAccueil: '', objet: '' })
    expect(lireMotifMission(undefined)).toEqual({ lieuAccueil: '', objet: '' })
    expect(lireMotifMission('  \n ')).toEqual({ lieuAccueil: '', objet: '' })
  })
})

describe('motifAEnregistrer', () => {
  it('laisse le motif tel quel quand le formulaire n’est pas celui d’une mission', () => {
    expect(motifAEnregistrer({ motif: 'Repos' })).toBe('Repos')
    expect(motifAEnregistrer({ motif: undefined })).toBeUndefined()
    expect(motifAEnregistrer({ motif: null })).toBeNull()
  })

  it('recompose le motif d’une mission à partir des deux champs', () => {
    expect(motifAEnregistrer({ lieuAccueil: LIEU, objetMission: OBJET })).toBe(
      `Lieu d'accueil : ${LIEU}\nObjet : ${OBJET}`
    )
  })

  it('vide le motif quand les deux champs d’une mission sont laissés vides', () => {
    expect(motifAEnregistrer({ lieuAccueil: '', objetMission: '' })).toBeNull()
  })

  it('les champs de la mission l’emportent sur un ancien motif', () => {
    expect(motifAEnregistrer({ motif: 'Ancien', lieuAccueil: LIEU, objetMission: '' })).toBe(
      `Lieu d'accueil : ${LIEU}`
    )
  })
})

describe('motifMissionSurUneLigne', () => {
  it('sépare le lieu et l’objet par un tiret', () => {
    expect(motifMissionSurUneLigne(composerMotifMission({ lieuAccueil: LIEU, objet: OBJET }))).toBe(
      `${LIEU} — ${OBJET}`
    )
  })

  it('ramène un objet sur plusieurs lignes à une seule', () => {
    expect(motifMissionSurUneLigne("Lieu d'accueil : Paris\nObjet : a\nb")).toBe('Paris — a b')
  })

  it('reproduit un motif libre ou absent comme avant', () => {
    expect(motifMissionSurUneLigne('Colloque  international\nà Paris')).toBe(
      'Colloque international à Paris'
    )
    expect(motifMissionSurUneLigne(null)).toBe('')
  })
})

describe('erreurDetailsMission', () => {
  it('ne dit rien quand le lieu et l’objet sont renseignés', () => {
    expect(
      erreurDetailsMission(composerMotifMission({ lieuAccueil: LIEU, objet: OBJET }))
    ).toBeUndefined()
  })

  it('dit ce qui manque, avec le moyen de le corriger', () => {
    expect(erreurDetailsMission(null)).toBe(
      "Avant de générer l'attestation, renseignez l'établissement d'accueil et l'objet de la mission (bouton « Modifier »)."
    )
    expect(erreurDetailsMission(`Objet : ${OBJET}`)).toBe(
      "Avant de générer l'attestation, renseignez l'établissement d'accueil de la mission (bouton « Modifier »)."
    )
    expect(erreurDetailsMission(`Lieu d'accueil : ${LIEU}`)).toBe(
      "Avant de générer l'attestation, renseignez l'objet de la mission (bouton « Modifier »)."
    )
  })

  it('un motif libre ancien compte pour l’objet : il manque encore l’établissement d’accueil', () => {
    expect(erreurDetailsMission('Colloque à Paris')).toMatch(
      /l'établissement d'accueil de la mission/
    )
  })
})
