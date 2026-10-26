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

## Validation des saisies

Chaque formulaire est validé côté serveur par un schéma zod
(`src/lib/validations/`). Trois règles s'appliquent à tous :

- **Importer les briques de `champs.ts`**, jamais `zod` seul pour un champ
  courant : ce fichier charge `messages-fr.ts`, qui met les messages de zod en
  français (« Date invalide. », « Adresse e-mail invalide. »…). Un message
  écrit dans le schéma reste prioritaire.
- **`texteObligatoire()`** retire les espaces avant le contrôle : un nom
  réduit à des espaces est refusé au lieu d'être enregistré.
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

Les décisions d'absence sont :

| Gabarit                                      | Absence            |
| -------------------------------------------- | ------------------ |
| `templates/attestation-conge-maternite.docx` | congé de maternité |
| `templates/attestation-conge-maladie.docx`   | congé de maladie   |
| `templates/attestation-mission.docx`         | mission            |

Balises communes aux trois : `{civilite}`, `{nomComplet}`, `{matricule}`, `{gradeActuel}`,
`{nomDepartement}`, `{nomEtablissement}`, `{titreResponsable}`, `{dateDebut}`, `{dateFin}`,
`{referenceCorrespondance}`, `{dateDemandeInteressee}`. Le gabarit de **mission** en ajoute
quatre : `{lieuAccueil}` et `{objetMission}` (voir ci-dessous), et `{interesse}` /
`{autorise}`, qui s'accordent au sexe de l'enseignant (« intéressée » / « intéressé »,
« autorisée » / « autorisé »).

Le gabarit de mission est dérivé de celui du congé de maladie : mêmes en-tête, visas,
signature et ampliations ; seuls le titre, la formule « demande de l'intéressé(e) » et les
trois articles changent (autorisation de la mission, reprise de service dans
l'établissement de départ, publication). Les références du visa « correspondance » y sont en
Arial Narrow : dans les trois gabarits d'origine elles portaient le style « Source Text »
(police à chasse fixe) et s'imprimaient en police de machine à écrire.

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
- Le bouton « Supprimer » demande une confirmation. Une absence déjà supprimée (autre
  onglet, double clic) ramène simplement à la liste.
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
