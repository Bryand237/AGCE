# Gestion de carrière des enseignants

Application locale (Next.js App Router + PostgreSQL/Prisma) pour la
gestion administrative de la carrière des enseignants : informations
personnelles, établissements, absences, avancements d'échelon et
rapports semestriels.

## Prérequis

- Node.js 22 LTS (voir `.nvmrc` — `nvm use` si vous utilisez nvm)
- Docker Desktop (ou Docker Engine + Compose sur Linux)
- Git

## Mise en place initiale (une seule fois)

`create-next-app` refuse de générer un projet dans un dossier non vide
— et ce dépôt en contient déjà beaucoup. Marche à suivre sûre :

1. Renommer ce dossier pour qu'il serve uniquement de source à copier,
   puis scaffolder Next.js dans un dossier neuf et vide, à côté :

   ```bash
   mv gestion-carriere-enseignants _overlay
   npx create-next-app@latest gestion-carriere-enseignants
   cd gestion-carriere-enseignants
   ```

   Répondre : TypeScript **oui**, ESLint **oui**, Tailwind CSS **oui**,
   répertoire `src/` **oui**, App Router **oui**, alias d'import `@/*`
   par défaut.

2. Copier tout le contenu de `_overlay`, **sans jamais écraser** ce que
   `create-next-app` vient de générer (`-n` = no-clobber) :

   ```bash
   cp -rn ../_overlay/. .
   ```

3. Cinq fichiers existent des deux côtés : forcer le remplacement par
   **nos** versions personnalisées (sortie standalone, mode strict,
   config ESLint Next 16 + Prettier, documentation réelle) :

   ```bash
   cp -f ../_overlay/next.config.ts .
   cp -f ../_overlay/tsconfig.json .
   cp -f ../_overlay/eslint.config.mjs .
   cp -f ../_overlay/README.md .
   cp -f ../_overlay/.gitignore .
   cd .. && rm -rf _overlay && cd gestion-carriere-enseignants
   ```

   **Option 100% manuelle (sans `create-next-app`)** : ce dépôt fournit
   déjà un `package.json` et un `src/app/` minimal fonctionnels — un
   simple `npm install` suffit alors, sans les étapes 1 à 3. Utile si
   `create-next-app` pose problème pour une autre raison (proxy,
   version de Node...). Les versions du `package.json` fourni sont des
   plages (`^`) : `npm install` résout de toute façon les derniers
   correctifs compatibles au moment de l'exécution, donc rien n'y est
   figé dans le temps.

4. Finir l'installation et activer les hooks Git :

   ```bash
   npm install
   npx playwright install --with-deps chromium
   npx husky init
   ```

   `.lintstagedrc.json` et `.husky/pre-commit` sont déjà fournis —
   `husky init` ne fait qu'activer le mécanisme de hooks Git.

5. Copier `.env.example` en `.env` et renseigner un vrai mot de passe.

6. Démarrer uniquement la base de données pour la première migration :

   ```bash
   docker compose up -d db
   npx prisma migrate dev --name init
   npx prisma generate
   npm run db:seed
   ```

   ⚠️ **Le `npx prisma generate` explicite n'est pas optionnel.**
   Contrairement aux versions précédentes, Prisma 7 ne régénère plus le
   client automatiquement après `migrate dev`. Sans cette étape,
   `src/lib/prisma.ts` pointe vers un dossier (`src/generated/prisma`)
   qui n'existe pas encore, et tout import du client Prisma échoue.

7. Vérifier que tout fonctionne :

   ```bash
   npm run dev
   npm run test:run
   ```

8. Une fois un premier module prêt, démarrer la stack complète :

   ```bash
   docker compose up -d --build
   ```

## Scripts disponibles

Déjà présents dans le `package.json` fourni (rien à ajouter à la main) :

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "npm run lint && npm run type-check && next build",
    "start": "next start",
    "lint": "eslint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

## Architecture

```
src/
  app/          Routes Next.js (App Router) — pages, layouts, Server Actions
  domain/       Logique métier PURE — aucune dépendance à Prisma ni React,
                testée unitairement (Vitest). C'est ici que vivent les
                règles d'avancement, jamais dans un composant ou une action.
  lib/          Infrastructure : client Prisma, utilitaires (cn(), etc.)
  components/   Composants UI partagés
prisma/
  schema.prisma Schéma de données
  seed.ts       Chargement de la grille indiciaire officielle
tests/e2e/      Tests Playwright (parcours utilisateur critiques)
```

Règle de dépendance : `app` peut importer `domain` et `lib`. `domain` ne
doit jamais importer `lib/prisma` ni quoi que ce soit de React — c'est
ce qui le garde testable sans base de données ni navigateur.

## Erreurs fréquentes à éviter

- **Oublier `output: 'standalone'`** dans `next.config.ts` : le
  Dockerfile multi-stage échoue silencieusement à l'étape finale.
- **`DATABASE_URL` avec le mauvais hôte** : `localhost` quand Next.js
  tourne en local (`npm run dev`) contre un Postgres dockerisé ; `db`
  (le nom du service) quand toute la stack tourne dans docker-compose.
- **Committer `.env`** : seul `.env.example` doit être versionné.
- **Oublier le volume nommé `pgdata`** dans `docker-compose.yml` : un
  `docker compose down` effacerait toute la base sans lui.
- **Multiples instances PrismaClient en dev** : toujours passer par le
  singleton de `src/lib/prisma.ts`, jamais `new PrismaClient()` ailleurs.
- **`next lint`** : supprimé depuis Next.js 16. Utiliser `npm run lint`.
- **Taper l'indice à la main dans un formulaire** : il doit toujours
  être dérivé de `EchelonIndiciaire`, jamais saisi librement.
- **Oublier `npx prisma generate` après une migration** : depuis Prisma
  7, `migrate dev` ne le fait plus automatiquement.
- **Confondre `voie` et `sousCategorie` dans `EchelonIndiciaire`** :
  `voie` sépare des embranchements réellement parallèles et exclusifs
  (seul Assistant en a) ; `sousCategorie` n'est qu'un libellé
  d'affichage pour un palier hors numérotation (Délégué, Stagiaire...).
  Le calcul du palier suivant ne doit jamais filtrer sur
  `sousCategorie`, seulement sur `voie`. Voir les tests de
  `calculerProchainEchelon.test.ts` pour le cas concret que ça évite.

Voir aussi `CONVENTIONS.md` pour les règles de nommage et de commit.
