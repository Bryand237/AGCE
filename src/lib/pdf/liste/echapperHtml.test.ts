import { describe, expect, it } from 'vitest'
import { echapperHtml } from './echapperHtml'

describe('echapperHtml', () => {
  it('laisse un texte ordinaire intact, accents compris', () => {
    expect(echapperHtml('Chargé de Cours — Ngaoundéré')).toBe('Chargé de Cours — Ngaoundéré')
  })

  it('neutralise les caractères du balisage', () => {
    expect(echapperHtml(`<b>"gras"</b> & l'apostrophe`)).toBe(
      '&lt;b&gt;&quot;gras&quot;&lt;/b&gt; &amp; l&#39;apostrophe'
    )
  })

  it('ne protège pas deux fois un texte déjà protégé par erreur (pas de magie)', () => {
    expect(echapperHtml('&amp;')).toBe('&amp;amp;')
  })

  it('rend un script inoffensif', () => {
    expect(echapperHtml('<script>alert(1)</script>')).not.toContain('<script')
  })
})
