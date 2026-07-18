import { chromium } from 'playwright'

type OptionsPdf = {
  paysage?: boolean
  piedDePage?: string
}

/**
 * Convertit un fragment HTML en PDF via Chromium headless. Utilitaire
 * générique partagé par tous les documents imprimés de l'application
 * (liste des enseignants, rapport semestriel d'avancement...) — un seul
 * moteur de rendu à maintenir plutôt qu'un par document.
 *
 * En Docker, nécessite `npx playwright install --with-deps chromium`
 * dans le Dockerfile (déjà présent — voir README).
 */
export async function genererPdf(html: string, options: OptionsPdf = {}): Promise<Buffer> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdf = await page.pdf({
      format: 'A4',
      landscape: options.paysage ?? false,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>', // vide : l'en-tête vit dans le HTML lui-même, pas ici
      footerTemplate:
        options.piedDePage ??
        `<div style="font-size:8px; width:100%; text-align:center; color:#000;">
           Page <span class="pageNumber"></span> / <span class="totalPages"></span>
         </div>`,
      margin: { top: '14mm', bottom: '14mm', left: '10mm', right: '10mm' },
    })
    return pdf
  } finally {
    await browser.close()
  }
}
