# Mettre les données de la base sur un dossier du disque

Ce document s'adresse à la personne qui utilise l'application, sous Windows avec WSL (Ubuntu) et
Docker. Il explique comment sortir la base de données de la « boîte » où Docker la range par
défaut (un volume nommé, `pgdata`) pour la placer dans un **dossier ordinaire** de la distribution
Ubuntu, que l'on voit, que l'on copie et que l'on sauvegarde comme n'importe quel dossier.

**Rien n'est supprimé** dans cette procédure : l'ancien volume reste intact, de sorte qu'on peut
revenir en arrière tant que l'on n'a pas décidé de le supprimer.

## Pourquoi le faire

Par défaut, `docker-compose.yml` range la base dans un volume nommé (`pgdata`). Avec Docker
Desktop, ce volume vit dans un disque virtuel propre à Docker (un fichier `.vhdx` sous
`C:\Users\<nom>\AppData\Local\Docker\wsl`, selon la version). On ne le voit pas depuis Ubuntu, et
il disparaît si l'on réinitialise Docker Desktop (« Reset to factory defaults », « Clean / Purge
data ») ou si l'on exécute `docker compose down -v` ou `docker volume prune`.

Avec un dossier, la base est dans `~/agce-data/postgres` (côté Windows :
`\\wsl$\Ubuntu\home\<utilisateur>\agce-data\postgres`). Les commandes de Docker ne peuvent plus la
supprimer par mégarde, et la sauvegarde est celle d'un dossier.

⚠️ **Ce que cela ne remplace pas** : une sauvegarde. Un dossier sur le même disque ne protège pas
d'une panne de ce disque. Continuer à lancer `npm run db:sauvegarder`, avec `DOSSIER_COPIE` vers
une clé ou un autre disque (voir le README, « Sauvegarde et restauration »).

## Règles à respecter

1. **Le dossier doit être dans le système de fichiers d'Ubuntu** (`~/agce-data/…`), **jamais sous
   `/mnt/c/…`** (le disque Windows). Postgres exige des droits et un propriétaire Linux que le
   disque Windows ne sait pas fournir : la base refuserait de démarrer, ou serait très lente.
2. **Ne jamais copier le dossier de la base pendant que la base tourne** : on obtiendrait une copie
   inutilisable. Soit on arrête la base (`docker compose stop`), soit on utilise `db:sauvegarder`.
3. **Ne jamais ouvrir ni modifier à la main les fichiers de ce dossier** : leur propriétaire est
   l'utilisateur interne de Postgres (numéro 70), ce qui est normal. Pas de `chmod`, pas de
   `chown`.
4. **Ne jamais ajouter `-v`** à `docker compose down`, ni lancer `docker volume rm`,
   `docker volume prune` ou `docker system prune --volumes` tant que la procédure n'est pas
   terminée et vérifiée.

Les commandes ci-dessous se lancent **dans le dossier du projet** (celui qui contient
`docker-compose.yml` et `.env`), dans le terminal Ubuntu.

## Procédure

### 1. Faire une sauvegarde de sécurité

```bash
npm run db:sauvegarder
ls -lh backups/
```

Deux fichiers datés du jour doivent apparaître (`agce_….dump` et `fichiers_….tar.gz`). Les copier
sur une clé USB ou un autre disque avant d'aller plus loin. **Si cette étape échoue, s'arrêter
là** et demander de l'aide.

### 2. Noter l'état actuel de la base

La base doit tourner (`docker compose up -d db`). Cette commande compte les lignes de chaque table
et enregistre le résultat dans un fichier :

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT table_name, (xpath(\$\$/row/c/text()\$\$, query_to_xml(format(\$\$select count(*) as c from %I.%I\$\$, table_schema, table_name), false, true, \$\$\$\$)))[1]::text AS lignes FROM information_schema.tables WHERE table_schema = \$\$public\$\$ AND table_type = \$\$BASE TABLE\$\$ ORDER BY 1;"' > ~/avant.txt
cat ~/avant.txt
```

On voit une liste du type `Enseignant|412`. Si le fichier est vide, ne pas continuer.

### 3. Arrêter l'application et la base

Arrêter `npm run dev` (Ctrl+C dans son terminal), puis :

```bash
docker compose stop
docker compose logs db --tail 5
```

`stop` arrête sans rien supprimer. Les dernières lignes du journal doivent contenir
`database system is shut down`. Ne **pas** utiliser `docker compose down`.

### 4. Retrouver le nom du volume actuel

```bash
VOLUME=$(docker inspect "$(docker compose ps -aq db)" \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')
echo "Volume : $VOLUME"
```

Un nom est attendu (par exemple `agce_pgdata`). **S'il est vide, s'arrêter** : la base n'est pas
dans un volume nommé, la procédure ne s'applique pas telle quelle.

### 5. Créer le dossier de destination

```bash
mkdir -p ~/agce-data/postgres
ls -A ~/agce-data/postgres
```

La seconde commande ne doit rien afficher : le dossier doit être vide.

### 6. Copier les données du volume vers le dossier

On utilise l'image `postgres:16-alpine`, déjà présente sur la machine (aucun téléchargement). Le
conteneur est jetable (`--rm`) et ne démarre pas Postgres : il ne fait que copier.

```bash
docker run --rm --entrypoint sh \
  -v "$VOLUME":/source:ro \
  -v "$HOME/agce-data/postgres":/destination \
  postgres:16-alpine \
  -c 'cp -a /source/. /destination/ && chown "$(stat -c %u:%g /source)" /destination && chmod 700 /destination'
```

`cp -a` conserve les propriétaires et les droits. Le volume source est monté en lecture seule :
cette commande ne peut pas l'abîmer.

### 7. Vérifier la copie

```bash
docker run --rm --entrypoint sh \
  -v "$VOLUME":/source:ro \
  -v "$HOME/agce-data/postgres":/destination:ro \
  postgres:16-alpine \
  -c 'for d in /source /destination; do echo "$d : $(find $d | wc -l) éléments, $(du -sk $d | cut -f1) Ko"; done'
```

Les deux lignes doivent afficher **le même nombre d'éléments** et à peu près la même taille. Si ce
n'est pas le cas, ne pas continuer : refaire l'étape 6 vers un dossier neuf (par exemple
`~/agce-data/postgres-2`, à utiliser ensuite à la place de `postgres` dans toutes les commandes) ;
le dossier précédent n'a pas à être supprimé.

### 8. Indiquer à Docker d'utiliser le dossier

Créer, dans le dossier du projet, un fichier **`docker-compose.override.yml`** (Docker Compose le
lit automatiquement en plus de `docker-compose.yml`, et il reste local : le fichier du dépôt n'est
pas modifié, Git ignore ce nouveau fichier, donc les mises à jour ne le touchent pas) :

```yaml
services:
  db:
    volumes:
      - ${HOME}/agce-data/postgres:/var/lib/postgresql/data
```

Respecter exactement les espaces (deux par niveau, jamais de tabulation). Vérifier que Docker le
prend en compte :

```bash
docker compose config | grep -B2 -A6 "db:"
```

Sous `db:` doit apparaître une ligne `source: /home/<utilisateur>/agce-data/postgres` (avec
`type: bind`), et **plus** de `pgdata`. (Le mot `pgdata` peut rester dans la liste `volumes:` tout
en bas du fichier : c'est normal.)

### 9. Redémarrer la base

```bash
docker compose up -d db
docker compose ps
docker compose logs db --tail 20
```

`docker compose ps` doit finir par indiquer `healthy`. Dans le journal, **la ligne qui prouve que
les données sont bien reprises** est :

```text
PostgreSQL Database directory appears to contain a database; Skipping initialization
```

⚠️ Si le journal montre au contraire des lignes `initdb`, `running bootstrap script` ou
`PostgreSQL init process complete`, c'est que Docker a créé une base **vide** (le dossier n'était
pas bon). Ne rien saisir dans l'application :
`docker compose stop`, supprimer le fichier `docker-compose.override.yml`, puis
`docker compose up -d db` : on retrouve l'ancien volume intact.

### 10. Vérifier que rien n'a changé

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT table_name, (xpath(\$\$/row/c/text()\$\$, query_to_xml(format(\$\$select count(*) as c from %I.%I\$\$, table_schema, table_name), false, true, \$\$\$\$)))[1]::text AS lignes FROM information_schema.tables WHERE table_schema = \$\$public\$\$ AND table_type = \$\$BASE TABLE\$\$ ORDER BY 1;"' > ~/apres.txt
diff ~/avant.txt ~/apres.txt && echo "IDENTIQUE : les données sont toutes là"
```

Puis relancer l'application (`npm run dev`), se connecter et ouvrir quelques fiches
d'enseignants. Tout doit être comme avant.

### 11. Garder l'ancien volume

**Ne pas le supprimer.** Le garder au moins quelques semaines : c'est une seconde copie de la
base, telle qu'elle était à l'étape 3. À partir du moment où l'application est utilisée sur le
nouveau dossier, l'ancien volume ne reçoit plus rien et devient de plus en plus ancien : ne jamais
y retourner « pour voir ». Quand une sauvegarde récente a été vérifiée (README, « Vérifier
qu'une sauvegarde est utilisable »), il peut être supprimé ; la commande est alors
`docker volume rm <nom du volume>` (le nom relevé à l'étape 4), à ne faire qu'avec l'accord de la
personne qui gère l'application.

## Revenir en arrière

- **Dans la minute qui suit** (aucune saisie faite sur le nouveau dossier) : `docker compose stop`,
  supprimer `docker-compose.override.yml`, `docker compose up -d db`. L'ancien volume est repris
  tel quel.
- **Après quelques jours d'utilisation** : ne pas revenir à l'ancien volume (il ne contient pas le
  travail récent). Restaurer plutôt une sauvegarde récente (README, « Restaurer après un
  sinistre »).

## Après une mise à jour du projet

`git pull` ne touche ni `docker-compose.override.yml`, ni `~/agce-data` : la base continue d'être
lue dans le dossier.

## Les photos : y a-t-il quelque chose à déplacer ?

**Si l'application tourne avec `npm run dev` ou `npm start`** (cas actuel : seule la base est dans
Docker), **non**. Les photos sont dans le dossier du projet, `public/uploads/`, que
`npm run db:sauvegarder` copie déjà (archive `fichiers_….tar.gz`). Elles sont donc sur le disque
ordinaire et ne sont concernées ni par Docker, ni par cette procédure.

**Si un jour l'application elle-même tourne dans Docker** (`docker compose up -d --build`), ses
photos sont dans un second volume nommé, `uploads`, monté sur `/app/data/uploads`. La même
méthode s'applique, avec ces différences :

- étape 4 : relever le nom du volume de l'application (`docker inspect "$(docker compose ps -aq app)"`,
  destination `/app/data/uploads`) ;
- étape 6 : créer `~/agce-data/uploads`, puis copier avec la même commande (remplacer
  `postgres` par `uploads`, et la dernière partie de la commande par
  `cp -a /source/. /destination/ && chown -R 1001:1001 /destination` : l'application tourne sous
  l'utilisateur numéro 1001) ;
- étape 8 : le fichier `docker-compose.override.yml` devient (un seul `services:`) :

  ```yaml
  services:
    db:
      volumes:
        - ${HOME}/agce-data/postgres:/var/lib/postgresql/data
    app:
      volumes:
        - ${HOME}/agce-data/uploads:/app/data/uploads
  ```

## Récapitulatif des commandes interdites sans accord

| Commande                                              | Effet                                                |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `docker compose down -v`                              | supprime les volumes, donc la base                   |
| `docker volume rm …` / `docker volume prune`          | supprime des volumes                                 |
| `docker system prune --volumes`                       | supprime les volumes non utilisés                    |
| `rm -rf ~/agce-data`                                  | supprime la base placée dans le dossier              |
| « Reset to factory defaults » (Docker Desktop)        | supprime les volumes nommés                          |
| `git clean -fd`, `git checkout .`, `git reset --hard` | suppriment les photos et fichiers non suivis par Git |
