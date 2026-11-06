#!/usr/bin/env bash
# Restauration d'une sauvegarde faite par sauvegarder.sh.
#
# Trois usages :
#
#   ./scripts/restaurer.sh backups/agce_AAAAMMJJ_HHMMSS.dump
#       Restaure dans une NOUVELLE base de contrôle « <DB_NAME>_restauration ».
#       La base en service n'est pas touchée. C'est le test à faire pour
#       s'assurer qu'une sauvegarde est utilisable.
#
#   ./scripts/restaurer.sh backups/agce_AAAAMMJJ_HHMMSS.dump --production
#       REMPLACE la base en service par la sauvegarde. Arrêtez d'abord
#       l'application (npm run dev) et tout outil connecté à la base.
#       Une sauvegarde de sécurité de l'état actuel est faite avant.
#
#   ./scripts/restaurer.sh --fichiers backups/fichiers_AAAAMMJJ_HHMMSS.tar.gz
#       Extrait photos et logo dans ./restauration_fichiers/<date>/ sans rien
#       écraser. À vous de copier ensuite ce qui manque.
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"
# shellcheck source=scripts/lib-sauvegarde.sh
source "$RACINE/scripts/lib-sauvegarde.sh"

usage() {
  sed -n '2,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 2
}

MODE_PRODUCTION=0
MODE_FICHIERS=0
FICHIER=""
for arg in "$@"; do
  case "$arg" in
    --production) MODE_PRODUCTION=1 ;;
    --fichiers) MODE_FICHIERS=1 ;;
    -h | --help) usage ;;
    -*) erreur "option inconnue : $arg (voir --help)" ;;
    *) [ -z "$FICHIER" ] || erreur "un seul fichier de sauvegarde à la fois"; FICHIER="$arg" ;;
  esac
done
[ -n "$FICHIER" ] || usage
[ -s "$FICHIER" ] || erreur "fichier introuvable ou vide : $FICHIER"
[ "$MODE_PRODUCTION" = 0 ] || [ "$MODE_FICHIERS" = 0 ] || erreur "--production et --fichiers ne se combinent pas"

# ---- Fichiers (photos, logo) -------------------------------------------------
if [ "$MODE_FICHIERS" = 1 ]; then
  tar -tzf "$FICHIER" >/dev/null 2>&1 || erreur "archive illisible : $FICHIER"
  CIBLE_FICHIERS="restauration_fichiers/$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$CIBLE_FICHIERS"
  tar -xzf "$FICHIER" -C "$CIBLE_FICHIERS"
  echo "Fichiers extraits dans $CIBLE_FICHIERS (rien n'a été écrasé)."
  echo "Copiez-en le contenu dans le projet : public/uploads et reference-docs."
  exit 0
fi

# ---- Base de données ---------------------------------------------------------
DB_USER="$(lire_env DB_USER)"
DB_NAME="$(lire_env DB_NAME)"
DR_PORT="$(lire_env DR_PORT)"
[ -n "$DB_USER" ] && [ -n "$DB_NAME" ] || erreur "DB_USER et DB_NAME doivent être définis dans .env"

verifier_base_disponible

# L'archive doit être lisible avant que quoi que ce soit ne soit supprimé.
compose exec -T db pg_restore --list <"$FICHIER" >/dev/null 2>&1 \
  || erreur "archive illisible ou corrompue : $FICHIER. Rien n'a été modifié."

base_existe() {
  [ "$(compose exec -T db psql -U "$DB_USER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$1'" | tr -d '\r[:space:]')" = "1" ]
}

if [ "$MODE_PRODUCTION" = 1 ]; then
  CIBLE="$DB_NAME"
  echo "ATTENTION : la base « $CIBLE » va être REMPLACÉE par le contenu de $FICHIER."
  echo "Toutes les données saisies depuis cette sauvegarde seront perdues."
  [ -t 0 ] || erreur "confirmation impossible hors d'un terminal interactif"
  read -r -p "Pour continuer, tapez RESTAURER : " REPONSE
  [ "$REPONSE" = "RESTAURER" ] || erreur "confirmation incorrecte, rien n'a été modifié"

  echo "→ Sauvegarde de sécurité de l'état actuel"
  # Code 3 = sauvegarde faite mais copie vers DOSSIER_COPIE impossible : acceptable ici.
  CODE=0
  bash "$RACINE/scripts/sauvegarder.sh" || CODE=$?
  if [ "$CODE" != 0 ] && [ "$CODE" != 3 ]; then
    erreur "la sauvegarde de sécurité a échoué : restauration annulée, rien n'a été modifié"
  fi

  CONNEXIONS="$(compose exec -T db psql -U "$DB_USER" -d postgres -tAc \
    "SELECT count(*) FROM pg_stat_activity WHERE datname = '$CIBLE'" | tr -d '\r[:space:]')"
  [ "$CONNEXIONS" = "0" ] \
    || erreur "$CONNEXIONS connexion(s) ouverte(s) sur « $CIBLE ». Arrêtez l'application et les outils connectés (npm run dev, prisma studio), puis recommencez. Rien n'a été modifié."
else
  CIBLE="${DB_NAME}_restauration"
fi

echo "→ Restauration dans « $CIBLE »"
if base_existe "$CIBLE"; then
  compose exec -T db dropdb -U "$DB_USER" "$CIBLE"
fi
compose exec -T db createdb -U "$DB_USER" "$CIBLE"
if ! compose exec -T db pg_restore -U "$DB_USER" -d "$CIBLE" --no-owner --no-acl --exit-on-error <"$FICHIER"; then
  erreur "la restauration a échoué dans « $CIBLE »"
fi

TABLES="$(compose exec -T db psql -U "$DB_USER" -d "$CIBLE" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d '\r[:space:]')"
echo
echo "Restauration terminée : $TABLES tables dans « $CIBLE »."
if [ "$MODE_PRODUCTION" = 0 ]; then
  echo
  echo "Pour ouvrir l'application sur cette copie sans toucher à la vraie base,"
  echo "mettez temporairement dans .env :"
  echo "   DATABASE_URL=postgresql://$DB_USER:<DB_PASSWORD>@localhost:${DR_PORT:-51213}/$CIBLE"
  echo "puis relancez npm run dev. Remettez l'ancienne valeur ensuite."
  echo "Pour supprimer la copie : docker compose exec -T db dropdb -U $DB_USER $CIBLE"
fi
