#!/usr/bin/env bash
# Fonctions communes à sauvegarder.sh et restaurer.sh.
# Ce fichier se charge avec « source », il ne s'exécute pas seul.

erreur() {
  echo "ERREUR : $*" >&2
  exit 1
}

# Lit une clé du fichier .env SANS exécuter le fichier : les guillemets et
# les fins de ligne Windows (CRLF) sont gérés, les valeurs ne sont jamais
# interprétées par le shell.
lire_env() {
  local cle="$1" valeur
  [ -f .env ] || erreur "fichier .env introuvable dans $RACINE"
  valeur="$(grep -E "^${cle}=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r')" || true
  valeur="${valeur%\"}"
  valeur="${valeur#\"}"
  valeur="${valeur%\'}"
  valeur="${valeur#\'}"
  printf '%s' "$valeur"
}

# « docker compose » (Compose v2) ou, à défaut, « docker-compose » (v1).
compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    erreur "docker est introuvable. Docker Desktop est-il lancé, avec l'intégration WSL activée pour cette distribution ?"
  fi
}

# Vérifie que le conteneur de la base répond.
verifier_base_disponible() {
  compose exec -T db true >/dev/null 2>&1 \
    || erreur "le conteneur « db » ne répond pas. Démarrez-le avec : docker compose up -d db"
}
