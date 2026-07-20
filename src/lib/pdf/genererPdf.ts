import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

type OptionsPdf = {
  paysage?: boolean
  piedDePage?: string
}

const EXECUTABLE_CANDIDATS = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  process.env.CHROME_BIN,
  '/snap/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
].filter(Boolean) as string[]

function trouverExecutableChromium(): string | undefined {
  for (const chemin of EXECUTABLE_CANDIDATS) {
    if (existsSync(chemin)) return chemin
  }

  try {
    const chemin = chromium.executablePath()
    if (chemin && existsSync(chemin)) return chemin
  } catch {
    // ignore
  }

  return undefined
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
  const executablePath = trouverExecutableChromium()
  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
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
