const REMPLACEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Rend un texte sûr à insérer dans un document HTML : un nom contenant « & » ou « < » ne casse
 * pas la mise en page, et une saisie ne peut pas y glisser de balise.
 */
export function echapperHtml(valeur: string | number | null | undefined): string {
  return String(valeur ?? '').replace(/[&<>"']/g, (c) => REMPLACEMENTS[c] ?? c)
}
