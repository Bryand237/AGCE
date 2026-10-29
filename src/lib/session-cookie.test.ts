import { describe, expect, it } from 'vitest'
import { cookieSessionSecurise } from './session-cookie'

describe('cookieSessionSecurise', () => {
  it('garde le comportement d’origine sans variable : « Secure » en production seulement', () => {
    expect(cookieSessionSecurise({ NODE_ENV: 'production' })).toBe(true)
    expect(cookieSessionSecurise({ NODE_ENV: 'development' })).toBe(false)
    expect(cookieSessionSecurise({})).toBe(false)
  })

  it('SESSION_COOKIE_SECURE=false permet la connexion en HTTP même en production', () => {
    expect(cookieSessionSecurise({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' })).toBe(
      false
    )
  })

  it('SESSION_COOKIE_SECURE=true l’impose même en développement', () => {
    expect(cookieSessionSecurise({ NODE_ENV: 'development', SESSION_COOKIE_SECURE: 'true' })).toBe(
      true
    )
  })

  it.each([' TRUE ', 'False'])('ignore la casse et les espaces (%j)', (valeur) => {
    expect(cookieSessionSecurise({ SESSION_COOKIE_SECURE: valeur })).toBe(
      valeur.trim().toLowerCase() === 'true'
    )
  })

  it.each(['', 'oui', '1'])(
    'une valeur non reconnue (%j) revient au comportement d’origine',
    (valeur) => {
      expect(cookieSessionSecurise({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: valeur })).toBe(
        true
      )
      expect(
        cookieSessionSecurise({ NODE_ENV: 'development', SESSION_COOKIE_SECURE: valeur })
      ).toBe(false)
    }
  )
})
