import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Chaque test se connecte avec le même compte, et la connexion est refusée au-delà de 5 essais
  // en 5 minutes pour un identifiant (src/lib/connexion/limite-tentatives.ts) : un essai est compté
  // AVANT la vérification du mot de passe, et n'est effacé qu'une fois la connexion réussie. Avec
  // 6 connexions simultanées ou plus, la sixième serait refusée ; par défaut, Playwright lance
  // autant de processus que la moitié des cœurs de la machine (6 pour 12 cœurs).
  workers: 4,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // Un seul moteur pour un outil interne mono-utilisateur : firefox/webkit
  // peuvent être ajoutés ici si un vrai besoin de compatibilité apparaît.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
