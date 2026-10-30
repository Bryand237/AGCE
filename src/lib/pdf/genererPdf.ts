import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

type OptionsPdf = {
  paysage?: boolean
  /** Modèle HTML de l'en-tête de chaque page (hors du corps du document). Vide par défaut. */
  enTete?: string
  piedDePage?: string
  /** Marges de la page, en notation CSS (« 14mm »). */
  marges?: { haut: string; bas: string; gauche: string; droite: string }
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
    // Les documents sont du HTML fabriqué par l'application : aucun script n'a à s'y exécuter.
    // JavaScript est donc coupé dans la page, en plus de l'échappement des valeurs saisies
    // (echapperHtml) : si une valeur échappait un jour à l'échappement, elle ne pourrait pas
    // lire de fichier ni appeler de service depuis le Chromium du serveur.
    const contexte = await browser.newContext({ javaScriptEnabled: false })
    const page = await contexte.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdf = await page.pdf({
      format: 'A4',
      landscape: options.paysage ?? false,
      printBackground: true,
      displayHeaderFooter: true,
      // Vide par défaut : l'en-tête vit alors dans le HTML lui-même.
      headerTemplate: options.enTete ?? '<span></span>',
      footerTemplate:
        options.piedDePage ??
        `<div style="font-size:8px; width:100%; text-align:center; color:#000;">
           Page <span class="pageNumber"></span> / <span class="totalPages"></span>
         </div>`,
      margin: options.marges
        ? {
            top: options.marges.haut,
            bottom: options.marges.bas,
            left: options.marges.gauche,
            right: options.marges.droite,
          }
        : { top: '14mm', bottom: '14mm', left: '10mm', right: '10mm' },
    })
    return pdf
  } finally {
    await browser.close()
  }
}
