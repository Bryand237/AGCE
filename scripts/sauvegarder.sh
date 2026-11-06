#!/usr/bin/env bash
# Sauvegarde de la base AGCE (PostgreSQL dans Docker) et des fichiers qui ne
# sont pas dans Git : photos (public/uploads) et logo (reference-docs).
#
# Usage :  ./scripts/sauvegarder.sh        ou        npm run db:sauvegarder
#
# Variables facultatives (à placer devant la commande) :
#   DOSSIER_SAUVEGARDES  dossier de destination        (défaut : ./backups)
#   JOURS_CONSERVATION   durée de conservation en jours (défaut : 14)
#   DOSSIER_COPIE        second dossier (clé USB, dossier OneDrive...) où copier
#                        chaque sauvegarde. Une sauvegarde qui reste sur le même
#                        disque ne protège pas d'une panne de ce disque.
#
# Codes de sortie : 0 tout va bien · 1 échec de la sauvegarde ·
#                   3 sauvegarde faite, mais copie vers DOSSIER_COPIE impossible.
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"
# shellcheck source=scripts/lib-sauvegarde.sh
source "$RACINE/scripts/lib-sauvegarde.sh"

DB_USER="$(lire_env DB_USER)"
DB_NAME="$(lire_env DB_NAME)"
[ -n "$DB_USER" ] && [ -n "$DB_NAME" ] || erreur "DB_USER et DB_NAME doivent être définis dans .env"

DEST="${DOSSIER_SAUVEGARDES:-backups}"
JOURS="${JOURS_CONSERVATION:-14}"
case "$JOURS" in
  '' | *[!0-9]*) erreur "JOURS_CONSERVATION doit être un nombre entier de jours" ;;
esac

mkdir -p "$DEST"
HORO="$(date +%Y%m%d_%H%M%S)"
DUMP="$DEST/agce_${HORO}.dump"
FICHIERS="$DEST/fichiers_${HORO}.tar.gz"

verifier_base_disponible

# 1) La base. On écrit d'abord dans un fichier « .partiel » : une sauvegarde
#    interrompue ne se confond jamais avec une sauvegarde complète.
echo "→ Sauvegarde de la base « $DB_NAME »"
if ! compose exec -T db pg_dump -U "$DB_USER" -Fc "$DB_NAME" >"$DUMP.partiel"; then
  rm -f "$DUMP.partiel"
  erreur "pg_dump a échoué, aucune sauvegarde de la base n'a été créée"
fi

# Contrôle : l'archive doit être lisible et contenir des données de tables.
if ! compose exec -T db pg_restore --list <"$DUMP.partiel" >"$DUMP.liste" 2>/dev/null \
  || ! grep -q "TABLE DATA" "$DUMP.liste"; then
  rm -f "$DUMP.partiel" "$DUMP.liste"
  erreur "l'archive produite est illisible ou vide, elle a été supprimée"
fi
rm -f "$DUMP.liste"
mv "$DUMP.partiel" "$DUMP"

# 2) Les fichiers hors Git (photos, logo).
A_SAUVER=()
for dossier in public/uploads reference-docs; do
  if [ -d "$dossier" ]; then A_SAUVER+=("$dossier"); fi
done
if [ "${#A_SAUVER[@]}" -gt 0 ]; then
  echo "→ Sauvegarde des fichiers : ${A_SAUVER[*]}"
  if ! tar -czf "$FICHIERS.partiel" "${A_SAUVER[@]}" || ! tar -tzf "$FICHIERS.partiel" >/dev/null; then
    rm -f "$FICHIERS.partiel"
    erreur "l'archive des fichiers n'a pas pu être créée (la sauvegarde de la base, elle, est faite : $DUMP)"
  fi
  mv "$FICHIERS.partiel" "$FICHIERS"
else
  echo "→ Aucun dossier de fichiers à sauvegarder (public/uploads et reference-docs absents)"
  FICHIERS=""
fi

# 3) Copie vers un second support, si demandé.
CODE_SORTIE=0
if [ -n "${DOSSIER_COPIE:-}" ]; then
  echo "→ Copie vers $DOSSIER_COPIE"
  if [ -d "$DOSSIER_COPIE" ] && cp "$DUMP" ${FICHIERS:+"$FICHIERS"} "$DOSSIER_COPIE"/; then
    echo "   copie faite"
  else
    echo "AVERTISSEMENT : copie impossible vers « $DOSSIER_COPIE » (dossier absent ou support non branché ?)." >&2
    CODE_SORTIE=3
  fi
fi

# 4) Ménage : seulement APRÈS le succès de la nouvelle sauvegarde, et
#    uniquement les fichiers que ce script a lui-même créés.
find "$DEST" -maxdepth 1 -type f \( -name 'agce_*.dump' -o -name 'fichiers_*.tar.gz' \) \
  -mtime +"$JOURS" -print -delete | sed 's/^/   supprimé (plus de '"$JOURS"' jours) : /'

echo
echo "Sauvegarde terminée :"
du -h "$DUMP" ${FICHIERS:+"$FICHIERS"} | sed 's/^/   /'
exit "$CODE_SORTIE"
