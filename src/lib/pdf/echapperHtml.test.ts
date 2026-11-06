import { describe, expect, it } from 'vitest'
import { echapperHtml } from './echapperHtml'

describe('echapperHtml', () => {
  it('neutralise les caractères qui ont un sens en HTML', () => {
    expect(echapperHtml('<b>A&B</b> "x" \'y\'')).toBe(
      '&lt;b&gt;A&amp;B&lt;/b&gt; &quot;x&quot; &#39;y&#39;'
    )
  })

  it('laisse intacts les accents et les caractères ordinaires', () => {
    expect(echapperHtml('MBETOUMOU Marceline — Chargé de Cours')).toBe(
      'MBETOUMOU Marceline — Chargé de Cours'
    )
  })

  it('accepte un nombre, null et undefined', () => {
    expect(echapperHtml(785)).toBe('785')
    expect(echapperHtml(null)).toBe('')
    expect(echapperHtml(undefined)).toBe('')
  })
})
