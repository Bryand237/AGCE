// Palette de couleurs partagée pour tous les charts
// Inspirée des images fournies : jeu varié mais sobre pour usage administratif
export const CHART_PALETTE = [
  '#1B4965', // primaire - bleu profond
  '#D9A441', // or / accent
  '#C0392B', // rouge (erreur / attention)
  '#3F8556', // vert (succès)
  '#6C5CE7', // violet
  '#FF7A59', // corail
  '#37A6FF', // bleu clair
  '#F6C85F', // jaune doux
  '#9FB8C8', // gris-bleu doux
  '#7A6F9B', // lavande sombre
]

export function couleur(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]!
}

export function paletteFor(n: number): string[] {
  return Array.from({ length: n }, (_, i) => couleur(i))
}

export default CHART_PALETTE
