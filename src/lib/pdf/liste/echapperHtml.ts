/**
 * Protège un texte avant de l'insérer dans du HTML.
 *
 * Les listes PDF sont fabriquées en collant des chaînes dans un gabarit HTML que Chromium
 * interprète. Un nom comme « O'BRIEN & FILS » ou un domaine « <b>gras</b> » doit s'afficher tel
 * quel, et surtout une valeur saisie ne doit jamais pouvoir être prise pour du balisage (ni pour
 * un script) : tout ce qui vient de la base passe par ici.
 */
const REMPLACEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function echapperHtml(texte: string): string {
  return texte.replace(/[&<>"']/g, (caractere) => REMPLACEMENTS[caractere] ?? caractere)
}
