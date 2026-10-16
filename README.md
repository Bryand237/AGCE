# Gestion de carrière des enseignants

Application locale (Next.js App Router + PostgreSQL/Prisma) pour la
gestion administrative de la carrière des enseignants : informations
personnelles, établissements, absences, avancements d'échelon et
rapports semestriels.

## Prérequis

- Node.js 22 LTS (voir `.nvmrc` — `nvm use` si vous utilisez nvm)
- Docker Desktop (ou Docker Engine + Compose sur Linux)
- Git

Les commandes de ce document s'écrivent `docker compose ...` (Compose v2).
Si le terminal répond `unknown shorthand flag: 'd' in -d`, c'est que Compose
v2 n'est pas installé : écrivez alors `docker-compose ...` (avec un trait
d'union) à la place, ou installez le plugin Compose v2.

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

## Contrôle d'accès

Toutes les pages et tous les téléchargements (liste des enseignants,
rapports, décisions, attestations) exigent une connexion. Ce contrôle est
fait par `src/proxy.ts`. Ce fichier doit rester dans `src/`, à côté du
dossier `app` : placé à la racine du dépôt, Next.js l'ignore sans aucun
message et plus rien n'est protégé.

Les quatre routes de téléchargement (liste des enseignants, rapport PDF,
décision, attestation) refusent en plus, par `refuserSiNonConnecte()`
(`src/lib/auth.ts`), toute requête sans session valide (réponse `401`) : ce
second verrou joue même si le proxy est contourné ou désactivé.

Chaque action serveur (créer, modifier, supprimer, valider… un enseignant, une
absence, un rapport, un établissement) vérifie elle-même la session :
`await exigerUtilisateur()`, **en toute première ligne** de la fonction
(`src/lib/auth.ts`). Sans session valide, l'action n'exécute rien et renvoie
vers `/connexion`. Une action est en effet une adresse HTTP appelable sans
passer par la page qui l'affiche ; le proxy et le layout seuls ne suffisent pas.
Les seules exceptions sont `seConnecter` et `seDeconnecter`
(`src/app/connexion/actions.ts`). **Toute nouvelle action doit commencer par la
même ligne** : le test `src/app/actions-protegees.test.ts` échoue sinon.

**Exception : les photos** (`/uploads`). Elles s'affichent grâce à
l'optimiseur d'images de Next.js, qui relit chaque fichier sans le cookie
de connexion : leur imposer une connexion ferait disparaître toutes les
photos. Elles restent donc atteignables sans connexion, mais seulement par
qui connaît l'adresse exacte du fichier (son nom est un identifiant
aléatoire, jamais affiché hors des pages protégées).

**Vérifier**, application lancée et sans être connecté :

```bash
curl -i http://localhost:3000/enseignants/liste-pdf
```

La réponse attendue est `HTTP/1.1 307` avec un en-tête `location` qui
désigne `/connexion` (ou une réponse `401`). Une réponse `200` avec un PDF
signifie que le contrôle d'accès est inactif. Les tests automatiques
équivalents : `npm run test:e2e -- acces-protege`.

## Accès réseau à la base de données

Le port de la base (`DR_PORT`, 51213 par défaut) est publié par
`docker-compose.yml` sur `127.0.0.1` uniquement : la base n'est joignable
que depuis la machine qui l'héberge, jamais depuis le réseau. Les
identifiants du fichier `.env` ne protègent donc plus seuls les données.

**Vérifier** : `docker compose ps` doit afficher `127.0.0.1:51213->5432/tcp`
pour le service `db`. Une ligne `0.0.0.0:51213->5432/tcp` signifie que
l'ancien réglage est encore actif.

**Appliquer sur une installation existante** (après mise à jour du
dépôt) : faire d'abord `npm run db:sauvegarder`, arrêter `npm run dev`,
puis

```bash
docker compose stop db
docker compose rm -f db
docker compose up -d db
```

Cela recrée le conteneur `db` avec le nouveau réglage, en quelques
secondes. Les données sont dans le volume `pgdata` : elles ne sont pas
touchées. Avec l'ancien `docker-compose`, mêmes commandes avec un trait
d'union ; la séquence `stop`, `rm`, `up` évite l'erreur `ContainerConfig`
que cet ancien outil provoque parfois à la recréation d'un conteneur.
N'ajoutez jamais l'option `-v` à ces commandes : elle supprimerait les
données de la base.

**Si l'application ne se connecte plus** après ce changement (erreur
`ECONNREFUSED`, souvent avec `::1`) : dans `.env`, remplacer `localhost`
par `127.0.0.1` dans `DATABASE_URL`, puis relancer l'application.

**Besoin d'ouvrir la base à une autre machine** (outil de requêtes
installé ailleurs) : ne pas retirer `127.0.0.1`. Passer par un tunnel
SSH (`ssh -L 51213:127.0.0.1:51213 utilisateur@machine`).

## Sauvegarde et restauration

La base de données contient toute la carrière des enseignants : sans
sauvegarde, une panne de disque ou un `docker compose down -v` la fait
perdre définitivement. Deux scripts (bash, à lancer depuis le dossier du
projet, sous WSL ou Linux) s'en chargent. Ils lisent `DB_USER`, `DB_NAME`
et `DR_PORT` dans `.env` et demandent que le conteneur `db` tourne
(`docker compose up -d db`).

**Faire une sauvegarde**

```bash
npm run db:sauvegarder
```

Crée dans `backups/` deux fichiers datés : `agce_AAAAMMJJ_HHMMSS.dump`
(la base) et `fichiers_AAAAMMJJ_HHMMSS.tar.gz` (photos de `public/uploads`
et logo de `reference-docs`, qui ne sont pas dans Git). L'archive de la
base est relue avant d'être déclarée valide. Les sauvegardes de plus de
14 jours sont supprimées (`JOURS_CONSERVATION=30 npm run db:sauvegarder`
pour changer la durée).

**Copier hors du disque de la machine.** Une sauvegarde qui reste sur le
même disque ne protège pas d'une panne de ce disque. Indiquer un second
dossier (clé USB, dossier OneDrive) avec `DOSSIER_COPIE` :

```bash
DOSSIER_COPIE=/mnt/e/Sauvegardes npm run db:sauvegarder
```

(`E:` côté Windows devient `/mnt/e` sous WSL.) Si ce dossier est
inaccessible, le script le signale et se termine avec le code 3 ; la
sauvegarde, elle, est bien faite.

**Planifier chaque jour (Windows)**. Planificateur de tâches → « Créer
une tâche » → onglet Actions → programme `wsl.exe`, arguments :

```text
-d Ubuntu -e bash -lc "cd ~/AGCE && DOSSIER_COPIE=/mnt/e/Sauvegardes bash scripts/sauvegarder.sh >> backups/sauvegarde.log 2>&1"
```

Remplacer `~/AGCE` par le dossier du projet et `Ubuntu` par le nom de la
distribution (`wsl -l`). Dans l'onglet Paramètres, cocher « Exécuter la
tâche dès que possible si un démarrage planifié a été manqué ». Docker
Desktop doit être lancé à l'heure de la tâche. Coller d'abord la ligne
`wsl.exe …` dans PowerShell pour vérifier qu'elle fonctionne, puis
consulter `backups/sauvegarde.log` le lendemain.

**Vérifier qu'une sauvegarde est utilisable** (à faire dès la première,
puis une fois par mois). Cette commande restaure dans une base de
contrôle séparée et ne touche pas à la base en service :

```bash
bash scripts/restaurer.sh backups/agce_AAAAMMJJ_HHMMSS.dump
```

Elle indique la `DATABASE_URL` à mettre temporairement dans `.env` pour
ouvrir l'application sur cette copie et constater que les données y sont.

**Restaurer après un sinistre.** Arrêter l'application (`npm run dev`) et
tout outil connecté à la base (`prisma studio`), puis :

```bash
bash scripts/restaurer.sh backups/agce_AAAAMMJJ_HHMMSS.dump --production
bash scripts/restaurer.sh --fichiers backups/fichiers_AAAAMMJJ_HHMMSS.tar.gz
```

La première commande remplace la base en service, après avoir demandé de
taper `RESTAURER` et fait une sauvegarde de sécurité de l'état actuel. La
seconde extrait photos et logo dans `restauration_fichiers/` sans rien
écraser : copier ensuite leur contenu dans le projet.

**À garder à part.** Le fichier `.env` (mots de passe) n'est pas dans la
sauvegarde, pour ne pas faire circuler des secrets avec les copies : en
conserver un exemplaire dans un endroit sûr. Ne jamais lancer
`docker compose down -v` : l'option `-v` supprime le volume de la base.

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

## Erreurs de la base dans les actions

Une action qui écrit dans la base entoure cet appel d'un `try/catch` et
traduit l'exception par `messageErreur()` (`src/lib/erreurs.ts`), qui lit le
code d'erreur de Prisma : un doublon (`P2002`) annonce le doublon, un
élément disparu (`P2025`) annonce qu'il n'existe plus, une base arrêtée ou
toute erreur inattendue reçoit un message distinct, jamais un faux doublon.
Les erreurs inattendues sont écrites dans la console du serveur avec le nom
de l'action : c'est là que le responsable technique cherche la cause.

```ts
try {
  await prisma.enseignant.create({ data })
} catch (erreur) {
  return {
    message: messageErreur(erreur, 'creerEnseignant', { unicite: 'Ce matricule existe déjà.' }),
  }
}
```

`redirect()` reste en dehors du `try` : il interrompt l'exécution en levant
une exception qu'un `catch` avalerait.

**Conserver la saisie quand un formulaire est refusé.** Avec
`<form action={…}>`, React 19 remet tous les champs à leur valeur de départ dès
que l'action se termine, même sur une erreur : l'utilisateur perdait toute sa
saisie (vérifié dans Chromium, listes déroulantes comprises). Les formulaires
de création et de modification d'un enseignant, d'une absence, d'un
établissement et d'un rapport utilisent donc `useActionConservee()`
(`src/lib/action-conservee.ts`) avec `<form method="post" onSubmit={…}>`. Un
formulaire qui reste affiché après un succès (ajout d'un département) garde
`<form action={…}>` : il a besoin de cette remise à zéro pour se vider.

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
