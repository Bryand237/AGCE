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

5. Copier `.env.example` en `.env` et remplacer **toutes** les valeurs « changer-… »
   (mots de passe de la base et du compte administrateur). Chaque variable y est commentée.

6. Démarrer uniquement la base de données, appliquer les migrations déjà
   présentes dans `prisma/migrations/`, puis créer les données de départ :

   ```bash
   docker compose up -d db
   npx prisma migrate deploy
   npx prisma generate
   npm run db:seed
   ```

   `migrate deploy` applique les migrations existantes ; `migrate dev` sert à en
   **créer** de nouvelles et n'a pas sa place dans une installation. **Le seed ne se
   lance qu'une fois** : il crée la grille indiciaire, qui est unique, donc un second
   lancement échoue. Il crée aussi le compte administrateur avec `ADMIN_USERNAME` et
   `ADMIN_PASSWORD` ; pour changer ce compte ensuite, utiliser la page « Mon compte »
   ou `npm run admin:reset` (voir « Contrôle d'accès »), jamais le seed.

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

### Tests : unitaires et de bout en bout

- **`npm run test:run`** (Vitest) : les règles métier et les actions, sans base ni navigateur. Ces tests
  ne dépendent **pas du fuseau horaire** de la machine : les dates sont stockées à minuit UTC et lues avec
  `getUTC…()` / `toISOString()`. `src/tests-independants-du-fuseau.test.ts` refuse, dans les tests, un
  accesseur « heure locale » (`getFullYear()`, `getDate()`, `toLocaleDateString()`…). Contrôle :
  `TZ=America/New_York npm run test:run` doit donner le même résultat que sans `TZ`.
- **`npm run test:e2e`** (Playwright) : les parcours complets dans un vrai navigateur, contre
  l'application construite et lancée par le test lui-même. **Ces tests ÉCRIVENT dans la base de
  `DATABASE_URL`** (enseignants, absences, rapports de test) : les lancer sur une base jetable (celle de
  la CI, ou une copie restaurée depuis une sauvegarde), **jamais sur la base de l'installation**. Ils ne
  se rejouent pas deux fois sur la même base.
  - Les fenêtres de confirmation (marquer une attestation signée, valider un rapport…) se valident avec
    `confirmer(page, /libellé du bouton/i)` (`tests/e2e/helpers.ts`), qui attend aussi leur fermeture.
  - Les listes déroulantes d'un formulaire se pilotent par leur identifiant (`#grade`) ou leur nom
    (`select[name="sexe"]`), pas par `getByLabel` : le libellé d'une liste englobe le texte de ses options.
  - `workers: 4` dans `playwright.config.ts` : chaque test se connecte avec le même compte, et la
    connexion est refusée au-delà de 5 essais en 5 minutes (voir « Page de connexion »).
- **CI** (`.github/workflows/ci.yml`) : le travail `verification` enchaîne lint, types, tests unitaires et
  de bout en bout sur une base PostgreSQL jetable ; le travail `image-docker` construit l'image
  (`docker build`), pour qu'un `Dockerfile` cassé se voie avant le déploiement.

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

### Identifiants de connexion (page « Mon compte »)

L'icône d'engrenage de l'en-tête ouvre `/compte` : on y change l'**identifiant** et le **mot de
passe** de connexion.

- le **mot de passe actuel est exigé à chaque enregistrement** : une session laissée ouverte sur
  un poste ne suffit pas pour prendre le compte ;
- règles : identifiant de 3 à 50 caractères (lettres, chiffres, `.` `_` `@` `-`) ; mot de passe d'au
  moins 8 caractères et d'au plus 72 octets (bcrypt ignorerait la suite). Un mot de passe laissé vide
  n'est pas modifié ;
- changer le mot de passe **ferme les autres sessions** du compte ; celle de la personne qui le
  change reste ouverte.

Les **identifiants initiaux** sont ceux du fichier `.env` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`), les
mêmes que ceux créés par le seed. Le bouton « Rétablir les identifiants initiaux » de la page les
remet (il demande aussi le mot de passe actuel), ferme toutes les sessions et renvoie à la
connexion : on se reconnecte aussitôt avec eux, ce qui prouve qu'ils fonctionnent. **Garder ces deux
lignes dans `.env`** après l'installation : sans elles, le bouton est indisponible.

**Identifiants oubliés** (on ne peut plus ouvrir la page) : dans un terminal, depuis le dossier de
l'application, base démarrée :

```bash
npm run admin:reset
```

Le compte reprend l'identifiant et le mot de passe de `.env` (il est créé s'il n'existe pas) et
toutes les sessions sont fermées. Aucune autre donnée n'est touchée. Si plusieurs comptes existent
et qu'aucun ne porte l'identifiant initial, le script refuse et ne modifie rien. Il n'y a volontairement
ni adresse e-mail ni « mot de passe oublié » par courriel : l'application est utilisée sur un poste,
et qui a accès au dossier de l'application et à son `.env` a déjà accès à la base.

### Page de connexion : essais limités, sessions

- **5 essais par identifiant, puis 5 minutes d'attente.** À partir du sixième essai en cinq
  minutes, la page répond « Trop de tentatives de connexion. Réessayez dans N minutes. » même avec
  le bon mot de passe. Le blocage s'arrête de lui-même quand le plus ancien essai a plus de cinq
  minutes ; une connexion réussie remet le compteur à zéro. Redémarrer l'application (`Ctrl+C`
  puis `npm run dev`) le remet aussi à zéro : le compteur est en mémoire, rien n'est écrit dans la
  base.
- La limite porte sur l'**identifiant** (« MBALA » et « mbala » comptent ensemble), pas sur
  l'adresse du poste : derrière une passerelle, tous les postes ont la même. Quelqu'un qui connaît
  l'identifiant peut donc le bloquer cinq minutes en se trompant exprès, sans pouvoir deviner le
  mot de passe pour autant. Un identifiant qui n'existe pas est limité de la même façon : le
  blocage ne révèle pas quels comptes existent.
- Un identifiant inconnu et un mauvais mot de passe reçoivent la même réponse (« Identifiants
  incorrects. ») **et prennent le même temps** : le mot de passe est comparé dans les deux cas.
- **« Rester connecté 30 jours »** : case de la page de connexion, décochée par défaut. Décochée,
  la session dure 12 heures. À ne cocher que sur un ordinateur que l'on est seul à utiliser.
- Les **sessions expirées** sont supprimées de la base à chaque connexion réussie.

### Cookie de session : HTTP ou HTTPS

Le cookie de connexion est marqué « Secure » **en production** (`NODE_ENV=production`) : le
navigateur ne le renvoie alors qu'en HTTPS (sauf sur `localhost`). Une application de production
servie en HTTP simple sur le réseau local (`http://192.168.x.x:3000`) accepterait donc la
connexion, puis renverrait sans cesse à la page de connexion, sans message. Dans ce cas, ajouter
dans `.env` :

```
SESSION_COOKIE_SECURE=false
```

puis relancer l'application. `true` impose l'attribut, `false` le retire ; sans la variable, rien ne
change (« Secure » en production seulement, jamais avec `npm run dev`). N'utiliser `false` que sans
HTTPS : l'accès à l'application doit alors rester limité au réseau de confiance, ou passer par un
proxy HTTPS.

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

## Mettre à jour une installation existante

Pour une machine où l'application tourne déjà (`npm run dev`, base dans Docker) et contient
des données. **Aucune mise à jour de cette série ne touche à `prisma/` : pas de migration, pas de
seed, la base et ses données restent telles quelles.** Le fichier `.env` n'est pas modifié non plus.

```bash
cd ~/AGCE                    # le dossier du projet
npm run db:sauvegarder       # filet de sécurité, à faire avant toute mise à jour
```

Arrêter `npm run dev` (Ctrl+C), puis :

```bash
git pull
npm install
npx prisma generate
npm run dev
```

`npx prisma migrate status` doit répondre « Database schema is up to date ». Ne **pas** lancer
`npm run db:seed` (il ne se lance qu'une fois, à l'installation) ni `prisma migrate reset`.
La base Docker n'est ni arrêtée ni recréée : `docker compose ps` doit toujours montrer `db`
en marche (sinon `docker compose up -d db`).

Les photos déjà enregistrées (`public/uploads/`) ne bougent pas et restent affichées. Si `git pull`
refuse de s'exécuter à cause de modifications locales, faire `git stash`, puis `git pull`, puis
`git stash pop`. **Ne jamais lancer `git clean`, `git checkout .` ni `git reset --hard`** : ces
commandes suppriment les photos et les autres fichiers que Git ne suit pas.

Pour placer la base sur un dossier du disque plutôt que dans un volume Docker, voir
[`docs/DONNEES-DOCKER.md`](docs/DONNEES-DOCKER.md).

## Images téléversées (photos et logos)

Les photos des enseignants et les images des établissements sont contrôlées avant tout
enregistrement (`src/domain/televersement/imageTeleversee.ts`) :

- **types acceptés** : JPEG, PNG et WebP, reconnus par les **premiers octets du fichier**, jamais
  d'après le type annoncé par le navigateur ni l'extension ; un fichier HTML ou SVG renommé
  « .png » est refusé ;
- **taille maximale** : 4 Mo (limite des actions serveur : 5 Mo) ;
- **un fichier refusé n'enregistre rien** : ni la fiche, ni la modification, et le message
  s'affiche dans le formulaire ;
- **nom unique** `<identifiant>-<AAAAMMJJHHMMSSmmm>.<extension>` : une photo remplacée change
  d'adresse, le navigateur n'affiche jamais l'ancienne ; le nouveau fichier est écrit en premier,
  la base mise à jour ensuite, l'ancien fichier supprimé en dernier. Une panne à n'importe quelle
  étape laisse donc toujours une photo valide.

**Où sont les fichiers** (`src/lib/televersement.ts`, seul module qui lit, écrit et supprime des
images) : par défaut dans `public/uploads/<enseignants|etablissements>/`, comme avant : rien ne
change pour une installation existante, et `npm run db:sauvegarder` les copie. L'adresse
enregistrée en base (`/uploads/<dossier>/<fichier>`) est servie par Next.js lorsque le fichier
existe dans `public/`, sinon par la route `src/app/uploads/[...chemin]/route.ts` (type d'image
reconnu à ses octets, en-tête `nosniff`). Cette route est publique, comme les photos l'ont
toujours été (voir « Contrôle d'accès »).

La variable `UPLOADS_DIR` désigne un autre dossier d'enregistrement ; l'image Docker la fixe à
`/app/data/uploads` (volume `uploads`, appartenant à l'utilisateur de l'application, alors que
`public/` est figé à la construction de l'image). Les anciens fichiers de `public/uploads` restent
lus. **Ce dossier n'est pas couvert par `db:sauvegarder`** : le sauvegarder à part.

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

## Listes paginées

Les listes de la base (absences, rapports d'avancement, établissements, départements d'un
établissement) se lisent toutes de la même façon (`src/lib/pagination.ts`) :

- **`lirePage(params.page)`** lit le numéro de page de l'adresse : toujours un entier de 1 au
  moins. `?page=abc`, `0`, `-3` ou `2.5` ouvrent la page 1 (avant, Prisma refusait la valeur et
  la page affichait une erreur) ;
- **`bornerPage(page, total)`** ramène la page demandée dans les pages qui existent : `?page=999`
  ouvre la dernière page, pas un tableau vide. On lit donc le total (`count`) **avant** la page,
  et la page renvoyée par la lecture est celle qu'il faut afficher ;
- chaque `orderBy` finit par l'**identifiant** : PostgreSQL ne garantit pas l'ordre des lignes à
  valeur égale d'une requête à l'autre, et avec `skip`/`take` une ligne pouvait apparaître sur
  deux pages ou sur aucune. Même chose quand le critère se répète beaucoup (le type d'un
  établissement : deux valeurs seulement, d'où un tri par nom en plus).

Deux tests (`src/app/pagination-des-pages.test.ts`) refusent le retour de `Number(params.page)` et
d'un `skip` calculé sans `bornerPage`. La liste des enseignants, elle, est filtrée et découpée en
mémoire (`paginer`), avec la même règle.

## Recherche dans les listes

Le champ « Rechercher » des listes d'enseignants, d'absences et de rapports d'avancement suit une
seule règle (`contientTousLesMots`, `src/domain/texte/`) : la saisie est découpée en mots, et
**chaque mot doit se retrouver** dans l'un des textes de la ligne. L'ordre des mots ne compte pas,
et un début de mot suffit : « Alice Mbarga », « mbarga alice » et « mba ali » trouvent tous
Alice MBARGA. Casse, accents et ponctuation sont ignorés des deux côtés (« nde » trouve « NDÉ »,
« 54eme » trouve « 54ème »). Une saisie vide, ou faite de ponctuation, ne filtre rien.

- **Enseignants** : nom, prénom, matricule (avec ou sans espace), domaine de recherche, lieu de
  naissance.
- **Absences** : nom, prénom ou matricule de l'enseignant (`identiteCorrespond`). La base ne sait
  comparer ni mots séparés ni accents : on lit l'identité des seuls enseignants qui ont une
  absence, on les filtre avec la même règle, puis les absences sont lues par identifiant.
- **Rapports d'avancement** : le numéro d'édition. Seule une date exacte `AAAA-MM-JJ` est lue
  comme une date (les rapports dont la période contient ce jour) : « 54 », « 2026 » ou
  « 2026-003 » étaient auparavant lus comme des dates par `new Date()` et ne trouvaient pas
  l'édition.
- **Établissements** : recherche sur le nom, par sous-chaîne (`contains`), sans ignorer les
  accents. C'est la seule liste qui n'a pas encore la règle commune.

Le test `src/app/recherche-des-pages.test.ts` refuse le retour de `contains: recherche` et de
`new Date(recherche)` dans les lectures (l'établissement est une exception listée).

## Transactions des rapports d'avancement

Valider, modifier ou supprimer un rapport d'avancement écrit dans plusieurs tables à la fois : tout
se fait dans une transaction, qui réussit en entier ou n'enregistre rien. Prisma annule par défaut
une transaction au bout de **5 secondes**, requêtes comprises ; sur un rapport de plusieurs centaines
de lignes, ou une base lente à répondre (premier démarrage, disque occupé), la validation pouvait
échouer sur une page d'erreur.

- **`OPTIONS_TRANSACTION`** (`src/lib/transactions.ts`) : 5 s d'attente d'une connexion libre, 30 s
  de durée maximale. Chaque transaction interactive des actions la reçoit en second argument ;
  `src/app/transactions-des-pages.test.ts` refuse une transaction qui l'oublie.
- **Validation d'un rapport** : l'historique des avancements s'écrit en une seule requête
  (`createMany`), et les enseignants écartés sont retirés du rapport en une seule requête ; seules
  les fiches des enseignants, qui reçoivent chacune une position différente, s'écrivent une à une.
- **Transaction expirée ou base en échec** : l'action répond par un message (« La validation a pris
  trop de temps : rien n'a été modifié. Réessayez »), et non par une page d'erreur. Rien n'est
  enregistré à moitié, le rapport reste un brouillon. La cause est écrite dans la console du serveur.

## Validation des saisies

Chaque formulaire est validé côté serveur par un schéma zod
(`src/lib/validations/`). Trois règles s'appliquent à tous :

- **Importer les briques de `champs.ts`**, jamais `zod` seul pour un champ
  courant : ce fichier charge `messages-fr.ts`, qui met les messages de zod en
  français (« Date invalide. », « Adresse e-mail invalide. »…). Un message
  écrit dans le schéma reste prioritaire.
- **`texteObligatoire()`** retire les espaces avant le contrôle : un nom
  réduit à des espaces est refusé au lieu d'être enregistré.
- **Un champ facultatif vidé s'efface** : `texteOptionnel` (téléphone, diplôme, domaine de
  recherche, poste de responsabilité) et l'e-mail rendent `null` quand le formulaire envoie une
  chaîne vide, et `undefined` seulement quand le champ est absent de la requête. Prisma écrit
  `null` mais ignore `undefined` : avec `undefined`, un numéro supprimé en modification
  réapparaissait à l'écran et sur les documents. Pour tout nouveau champ facultatif, utiliser
  `videEnNull` (`champs.ts`) plutôt que `|| undefined`.
- **Les dates sont comparées entre elles** dans le schéma (`superRefine`) :
  naissance non future, prise de service après la naissance, date d'effet
  d'échelon non antérieure à la prise de service, fin d'absence ou de période
  non antérieure au début. Une faute de frappe sur l'année (2099 pour 1999)
  fausserait l'âge de retraite et l'éligibilité à l'avancement.

Aucun âge minimal à la prise de service n'est imposé : c'est une règle à
confirmer avec le client.

## Positions proposées dans un rapport d'avancement

Un avancement d'échelon reste **dans le même grade et la même voie** que la
position de départ de l'enseignant et la **dépasse strictement**
(`src/domain/avancement/positionProposee.ts`). Plusieurs paliers peuvent être
franchis d'un coup. Le serveur refuse tout le reste, et la liste déroulante du
formulaire « Mettre à jour » ne propose que des positions acceptées.

- Un changement de **grade** ou de **voie** (par exemple Assistant sans thèse →
  avec thèse) n'est pas un avancement d'échelon et ne passe pas par un rapport :
  sans cette règle, `Enseignant.grade` ne correspondrait plus à sa position et
  les âges de retraite, les tris et les statistiques seraient faux. Si le
  service en a besoin, c'est un processus à concevoir à part.
- Dans un rapport **validé**, la position se juge à partir de celle d'avant
  l'avancement, et elle n'est modifiable que si aucune décision n'a été générée
  et si l'enseignant occupe toujours la position issue du rapport
  (`rapportValideModifiable.ts`).
- Toute écriture de `positionActuelleId` écrit `grade` dans la même requête.

### Notation d'une position

Trois écritures d'une même position de la grille : **longue** à l'écran (« 2ème Classe, 6ème
Échelon »), **de décision** dans les documents Word (« 2ème Classe 6ème Echelon »), **compacte**
dans le rapport PDF (« 2C/6E/1115 ») et **officielle** dans les décisions (« 2C/6E/1115 » aussi).
Les Assistants ont des échelons (1 à 3) sans classe : ils s'écrivent « 1er Échelon », « 1E/465 »,
jamais « — ». Leur indice distingue la voie « sans thèse » de la voie « avec thèse » (l'échelon 1
vaut 465 ou 605). La règle de la partie « classe / échelon » n'est écrite qu'à un endroit
(`notationPosition.ts`). Cette notation est une proposition à faire valider par le client.
Les paliers sans échelon numéroté (Délégué, Stagiaire, Classe Exceptionnelle, Hors Échelle)
s'écrivent par leur abréviation dans le rapport PDF, sans indice.

## Validation d'un rapport d'avancement

Les sélections d'un rapport datent de sa création ; la validation peut venir des
jours plus tard. À la validation, chaque enseignant est relu dans la même
transaction (`src/domain/avancement/selectionsAValider.ts`) :

- un enseignant devenu **retraité ou transféré**, ou dont la proposition **ne
  dépasse plus sa position actuelle** (second rapport validé pour la même
  période, fiche corrigée), est **signalé, jamais écarté en silence** ;
- le formulaire affiche la liste et demande confirmation. Confirmer valide les
  autres enseignants et retire les exclus du rapport, pour qu'il ne liste que
  ceux qui ont réellement avancé. Rien n'est écrit avant la confirmation ;
- si plus personne ne peut avancer, rien n'est validé.

Pour éviter d'en arriver là, la **création** d'un rapport prévient quand un autre
rapport en brouillon couvre déjà une partie de la même période : deux brouillons
proposent les mêmes enseignants, et valider les deux les ferait avancer deux
fois. C'est un avertissement, pas un blocage : le bouton « Créer quand même »
crée le rapport (`confirmerChevauchement=oui`).

## Période d'un rapport d'avancement

« Modifier le rapport » est proposé pour tous les rapports :

- **brouillon** : numéro, début et fin de période se modifient librement. La
  sélection déjà établie n'est pas recalculée (le formulaire le rappelle). Si la
  nouvelle période chevauche un autre brouillon, le même avertissement qu'à la
  création s'affiche (« Enregistrer quand même ») ;
- **rapport validé** : le numéro et le début de période se modifient. La **fin de
  période** est la date d'effet de chaque avancement (historique) et de l'échelon
  de chaque enseignant (fiche) : la changer reporte la nouvelle date aux deux
  endroits, dans la même transaction (`periodeRapport.ts`). C'est refusé, avec les
  noms en cause, tant qu'une décision a été générée pour un avancement du rapport
  ou qu'un enseignant a changé de position depuis (mêmes conditions que la
  modification d'une position, `rapportValideModifiable.ts`) : la date d'un
  document déjà produit ou d'un avancement ultérieur ne correspondrait plus.

Un rapport validé ne peut pas être supprimé : sa période ne se corrige donc que par
ce chemin, avant la génération des décisions.

## Métadonnées du conseil

Loi de finances, circulaire MINFI, dates des sessions du Conseil universitaire (CU) et
du Conseil d'administration (CA), date de signature : ces informations alimentent les
mentions « Vu… » et « session du… » des décisions individuelles.

- **Toutes facultatives** : un texte pas encore publié ou une session pas encore tenue ne
  bloque pas l'enregistrement. Ce qui est laissé vide vaut `null` (et non `undefined`, que
  Prisma ignore : une valeur devenue caduque pourrait sinon ne plus être retirée). La page du
  rapport liste ce qui manque encore (`metadonneesManquantes`) ;
- **modifiables à tout moment, y compris après la validation** du rapport : elles ne sont pas
  recopiées à la validation, mais lues à chaque génération de décision ;
- un **brouillon** de décision est un document enregistré : il garde les anciennes valeurs tant
  qu'on ne le régénère pas (bouton « Régénérer le brouillon »). Une décision **signée** n'est
  jamais modifiée, ni régénérée.

## PDF du rapport d'avancement

Le rapport imprimé (`/avancements/[id]/rapport-pdf`) reproduit le rapport papier du
conseil : page de garde bilingue (logo, « 54ème CONSEIL DE L'UNIVERSITÉ… », période),
puis **un tableau par établissement** (titre de l'établissement en première ligne,
grades en sous-titres, numérotation continue, matricule « 0652 125K », dates
« jj/mm/aaaa », positions « 2C/3E/870 »). La référence « UN/R/SG/DAAC/DEPE/SSPE » est
en haut à droite et « page/total » en bas à droite de chaque page. Les colonnes
« Observations » et « Avis CU/CA » se remplissent à la main (ou par la validation).

- La mise en page est une fonction pure (`src/lib/pdf/rapportAvancementHtml.ts`) et le
  choix des positions et des dates aussi (`lignesRapport.ts`) : on les teste sans Chromium.
- Pour un rapport **validé**, la fiche de l'enseignant porte déjà la nouvelle position :
  « dernier » et « nouvel » avancement se lisent dans l'historique, qui a gardé la
  position et la date d'avant. Un brouillon se lit dans la fiche et la position proposée.
- Police : Cambria, Times New Roman ou Liberation Serif. L'image Docker installe
  Chromium avec ses dépendances, qui comprennent Liberation ; sur une machine sans
  aucune de ces polices, Chromium prend sa police serif par défaut.
- Le logo est lu dans `reference-docs/logo.jpeg` (non versionné) ; s'il manque, la page
  de garde est produite sans logo.
- Les en-têtes de colonnes ne sont pas répétés sur les pages de suite, comme sur le
  rapport papier.

## Documents Word (décisions et attestations)

`src/lib/documents/` remplit les gabarits de `templates/` (docxtemplater). Pour que les
documents ressemblent aux décisions originales :

- **dates** : en toutes lettres, lues en UTC (`formaterDateLongue`) : « 14 avril 2026 »,
  « **1er** juillet 2023 ». Sans fuseau explicite, un serveur réglé à l'ouest de l'UTC
  affichait la veille ;
- **noms** : en capitales (`nomCompletPourActe`), comme « AKOA OWONA PLACIDE » ;
- **apostrophes** : l'apostrophe typographique (’) des gabarits, y compris dans les valeurs
  saisies (`typographierValeurs`) ;
- **positions** : « 2ème Classe 2ème Echelon » (`formaterPositionDecision`), sans la virgule
  ni l'accent de l'écran ;
- **département** : le nom enregistré est complet (« Département d'Histoire »), les gabarits
  n'ajoutent plus « Département » devant ;
- **police** : le paragraphe d'intitulé « Accordant un congé… » est en Times New Roman, comme
  dans l'original ; le reste du document est en Arial Narrow.

Pour modifier un gabarit, éditer le fichier `.docx` dans Word et le déposer dans `templates/`.
Les balises `{nomComplet}`, `{dateDebut}`… doivent rester d'un seul tenant.

### Numéro de décision et date de signature

Les **quatre** gabarits portent `{numeroDecision}` (« DECISION N°{numeroDecision}/UN/R/… ») et
`{dateSignature}` (« Fait à Ngaoundéré, le {dateSignature} »). Un test (`gabarits.test.ts`)
lit les vrais fichiers et échoue si l'une de ces balises disparaît ou est coupée en deux par
Word : sans elles, le numéro saisi n'apparaîtrait nulle part sur le papier.

- **Brouillon** : ni numéro ni date ne sont connus, le document garde ses blancs
  (`N°--------------------------` et `le ________________` ; `N°___________` et `le` seul pour
  la décision d'avancement). La décision d'avancement imprime tout de même la date de
  signature prévue par le conseil (« Métadonnées du conseil ») quand elle est renseignée.
- **Signature** (« Marquer signée ») : le document est **refait** avec le numéro et la date saisis
  dans le formulaire, puis remplace le brouillon dans la base. Pour une attestation, la
  signature est refusée, sans rien enregistrer, si le document ne peut pas être refait
  (mission sans établissement d'accueil ou objet, enseignant sans département).
- Le numéro est enregistré sans espaces autour : c'est tel quel qu'il est imprimé.
  Les valeurs par défaut des blancs sont dans `src/domain/documents/mentionsDeSignature.ts`.

Les décisions d'absence sont :

| Gabarit                                      | Absence            |
| -------------------------------------------- | ------------------ |
| `templates/attestation-conge-maternite.docx` | congé de maternité |
| `templates/attestation-conge-maladie.docx`   | congé de maladie   |
| `templates/attestation-mission.docx`         | mission            |

Balises des trois gabarits d'absence : `{nomComplet}`, `{gradeActuel}`, `{nomDepartement}`,
`{nomEtablissement}`, `{titreResponsable}`, `{dateDebut}`, `{dateFin}`,
`{referenceCorrespondance}`, `{dateDemandeInteressee}`. Les gabarits de **maladie** et de
**mission** y ajoutent `{civilite}` (« Madame » / « Monsieur ») et `{interesse}`
(« intéressée » / « intéressé »), qui s'accordent au sexe de l'enseignant : le congé de
maternité ne vise que des femmes, son gabarit les écrit au féminin. Celui de la mission
ajoute encore `{autorise}` (« autorisée » / « autorisé »), `{lieuAccueil}` et `{objetMission}`
(voir ci-dessous).

Le gabarit de **maladie** est dérivé de celui de maternité : mêmes en-tête, visas, signature
et ampliations. Il remplace ce qui est propre à la maternité (quatorze semaines « avec solde
entière », « avant et après la date présumée d'accouchement », « Madame », « l'intéressée »)
par : article 1er « Un congé de maladie est accordé du … au … à … », article 2 « À l'issue de ce
congé, l'intéressé(e) reprendra le service à 7 heures 30 minutes », article 3 (publication). Ni
durée en semaines ni solde n'y sont écrites : la base ne les connaît pas.

Le gabarit de **mission** est dérivé du même modèle : seuls le titre, la formule « demande de
l'intéressé(e) » et les trois articles changent (autorisation de la mission, reprise de service
dans l'établissement de départ, publication). Les gabarits de maladie et de mission tiennent
sur une page (lignes vides réduites, signature et ampliations insécables) et leurs références du
visa « correspondance » sont en Arial Narrow : dans ceux de maternité et d'avancement elles
portent encore le style « Source Text » (police à chasse fixe) et s'impriment en police de
machine à écrire.

### Références légales des attestations (mise à jour annuelle)

Les trois attestations d'absence citent **en dur**, dans leurs visas, la loi de finances de
l'exercice et la circulaire d'exécution budgétaire :

- « la loi n° 2025/012 du 17 décembre 2025, portant loi de finances de la République du Cameroun
  pour l'exercice 2026 » ;
- « la circulaire n° 00001877/C/MINFI du 31 décembre 2025, portant Instructions relatives à
  l'Exécution des lois de finances… ».

Ces textes changent **chaque année** (à la publication de la loi de finances, en janvier). Tant
qu'ils ne sont pas mis à jour, les attestations de la nouvelle année citent l'ancienne loi. La
décision d'avancement n'est pas concernée : ses références viennent de la page du rapport
(« Métadonnées du conseil »).

**Chaque année**, pour `attestation-conge-maternite.docx`, `attestation-conge-maladie.docx` et
`attestation-mission.docx` :

1. ouvrir le fichier de `templates/` dans Word ;
2. corriger les deux visas ci-dessus (numéro, date, exercice) ; ne pas toucher aux `{balises}` ;
3. enregistrer au format `.docx` dans `templates/`, puis lancer `npm run test:run` : le test
   `gabarits.test.ts` vérifie que les **trois** attestations citent la même loi de finances et la
   même circulaire, de sorte qu'un fichier oublié se voit ;
4. générer un brouillon de chaque type et relire les visas avant de signer quoi que ce soit.

Ces références sont dans les gabarits, et non dans l'application ou la base : une valeur qui ne
change qu'une fois l'an ne justifie ni un écran de réglage ni une migration. Si le client veut les
modifier lui-même sans passer par Word, c'est une évolution à chiffrer à part (elle demanderait
d'enregistrer ces deux références quelque part, ce que le schéma actuel ne permet pas sans
migration).

### Établissement d'accueil et objet d'une mission

La base n'a pas de colonne pour le lieu d'accueil (le schéma ne change pas) : le formulaire
d'une mission demande **l'établissement d'accueil** et **l'objet**, enregistrés ensemble dans
le champ `motif` de l'absence, chacun sur sa ligne avec son intitulé :

```
Lieu d'accueil : Université de Douala
Objet : Participation au jury de soutenance de thèses
```

Un motif libre saisi avant cette convention est lu comme l'**objet** de la mission. La
convention est dans `src/domain/absences/motifMission.ts` ; la liste « Enseignants en
mission » l'affiche sur une ligne (« Université de Douala — Participation au jury… »).
Le brouillon d'une mission **ne se génère qu'avec les deux informations** : un blanc ne doit
pas rester dans une décision signée.

## Changements de statut d'un enseignant

Un enseignant **actif** peut être marqué **transféré** ou **retraité**. Un transféré
ou un retraité ne revient en activité que par la **réactivation** ; il ne passe
jamais directement de l'un à l'autre (une des deux saisies était alors une erreur,
et sa date de fin de service serait écrasée sans que personne l'ait décidé).

Les trois actions (`marquerTransfere`, `marquerRetraite`, `reactiverEnseignant`)
relisent le statut **enregistré en base**, jamais celui que le formulaire
affichait, et refusent toute autre transition avec un message qui dit quoi faire
(`src/domain/enseignants/statut.ts`). Le refus s'affiche sous le formulaire ; il
suffit de recharger la page pour voir l'état actuel de la fiche.

| Action               | Statut      | Date de fin de service | Lieu de transfert |
| -------------------- | ----------- | ---------------------- | ----------------- |
| Transférer           | `TRANSFERE` | saisie                 | saisi             |
| Mettre à la retraite | `RETRAITE`  | saisie                 | effacé            |
| Réactiver            | `ACTIF`     | effacée                | effacé            |

La relecture et l'écriture ne forment pas une transaction : deux personnes qui
changeraient le statut de la même fiche à la même seconde pourraient encore se
marcher dessus, ce qui ne se produit pas dans un usage local à un seul poste.

Les formulaires de transfert et de retraite n'ont plus de champ « Observations » :
la base n'a pas de colonne pour l'enregistrer (en ajouter une exigerait une
migration), et la saisie était perdue sans avertissement. La fiche affiche la
**retraite prévue** (calculée) pour un enseignant actif, et la **date de retraite**
ou la **date de transfert** enregistrée pour un retraité ou un transféré.

## Étapes d'une absence

Une action serveur est une adresse HTTP appelable sans passer par la page : un onglet
resté ouvert ou un double envoi pouvait re-valider une absence, rouvrir une absence
terminée, changer les dates d'une absence dont l'attestation Word avait déjà été
générée avec les anciennes, ou supprimer une absence dont l'attestation est signée.
Chaque action relit désormais l'état **enregistré** de l'absence et juge l'étape
demandée (`src/domain/absences/etapesAbsence.ts`) ; la page propose exactement les
mêmes étapes.

| Étape                          | Permise quand                                                         |
| ------------------------------ | --------------------------------------------------------------------- |
| Valider l'absence              | elle est en attente                                                   |
| Générer le brouillon           | congé ou mission en période ou dépassé, sans attestation              |
| Valider (signer) l'attestation | congé ou mission en période ou dépassé, avec un brouillon             |
| Terminer (retour)              | en période ou dépassée ; pour un congé, une fois l'attestation signée |
| Modifier les dates             | ni terminée, ni attestation générée (brouillon ou signée)             |
| Supprimer                      | toujours, sauf quand l'attestation est signée                         |

- Un **brouillon d'attestation** garde les dates au moment de sa génération : pour les
  corriger, on supprime l'absence et on la recrée. Une attestation **signée** est un acte
  numéroté : l'absence ne se supprime ni ne se modifie plus.
- Une attestation enregistrée (brouillon ou signée) **reste téléchargeable à tout moment**,
  y compris une fois l'absence terminée : la fiche garde alors le bloc « Attestation » en
  simple consultation (lien de téléchargement, date et auteur de la signature), sans
  aucune étape. La règle est dans `src/domain/absences/presentationAttestation.ts`.
- Une **mission** a la même attestation qu'un congé (brouillon, signature, téléchargement à
  tout moment), mais son retour **ne dépend pas** de la signature : ce n'est pas le cas des
  congés. Les types concernés sont dans `src/domain/absences/typesAvecAttestation.ts`.
- La base connaît cinq **types** d'absence, mais seuls la mission, le congé de maternité et le
  congé de maladie se saisissent (formulaire et validation du serveur). « Congé administratif »
  et « autre » n'ont ni formulaire ni gabarit de décision : les ouvrir est une décision du client.
  La liste des types saisissables est dans `src/domain/absences/typesAbsence.ts`, les libellés
  dans `etatAbsence.ts` ; le graphique par type de la page des absences compte tous les types
  (les deux derniers n'y figurent que s'ils existent).
- Le bouton « Supprimer » demande une confirmation. Une absence déjà supprimée (autre
  onglet, double clic) ramène simplement à la liste.
- Le statut **« Dépassé »** n'est jamais écrit en base : il se déduit de la date de fin à
  chaque affichage (`src/domain/absences/statutEffectif.ts`), pour la liste, ses compteurs et
  la fiche. Une absence validée est « en période » jusqu'à son **dernier jour compris**,
  « dépassée » dès le lendemain, sans qu'il faille ouvrir une page pour le déclencher. Les
  anciennes valeurs « dépassé » enregistrées auparavant sont relues d'après les dates : une fin
  repoussée depuis fait redevenir l'absence « en période ». Le tri par statut de la liste suit
  ce statut calculé. Un test (`src/app/pages-sans-ecriture.test.ts`) interdit toute écriture en
  base dans une page, une mise en page ou un fichier `donnees.ts`.
- Un refus s'affiche sous le formulaire, sans recharger la page, avec le motif.
- Comme pour les statuts d'enseignant, la relecture et l'écriture ne sont pas une
  transaction : sans objet pour un usage local à un seul poste.

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
