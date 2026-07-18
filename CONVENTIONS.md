# Conventions du projet

L'objectif de ce document : que le code écrit aujourd'hui reste lisible
dans un an, y compris pour la même personne qui l'a écrit.

## Langue du code

- **Domaine métier en français** : modèles, champs, fonctions qui
  reflètent le vocabulaire réel du métier (`Enseignant`, `avancement`,
  `echelonActuel`, `calculerProchainEchelon`). C'est le "langage
  omniprésent" du domaine — le coller au vocabulaire des textes
  officiels évite les allers-retours de traduction mentale.
- **Infrastructure générique en anglais** : tout ce qui n'a pas de sens
  métier propre (`cn`, `prisma`, noms de dossiers techniques comme
  `lib`, `domain`, `components`).
- Ne jamais mélanger les deux langues à l'intérieur d'un même
  identifiant (éviter `getEnseignantByMatricule` — préférer
  `recupererEnseignantParMatricule` si la fonction porte du sens métier,
  ou rester en anglais si c'est un utilitaire générique).

## Nommage des fichiers

- Composants React : `PascalCase.tsx` (`FormulaireEnseignant.tsx`)
- Tout le reste (fonctions, utilitaires, config) : `camelCase.ts` ou
  `kebab-case.ts` selon ce que `create-next-app` a déjà posé — rester
  cohérent avec l'existant plutôt que de mélanger.
- Un fichier de test est toujours à côté du fichier testé :
  `calculerProchainEchelon.ts` + `calculerProchainEchelon.test.ts`.

## Commits — Conventional Commits

Format : `type(portée): description au présent`

| Type       | Usage                                          |
| ---------- | ----------------------------------------------- |
| `feat`     | Nouvelle fonctionnalité                         |
| `fix`      | Correction de bug                               |
| `refactor` | Changement de structure sans changer le comportement |
| `test`     | Ajout ou modification de tests                 |
| `docs`     | Documentation uniquement                        |
| `chore`    | Config, dépendances, tooling                    |

Exemples :

```
feat(enseignants): ajouter le formulaire de création
fix(avancement): corriger le calcul du palier suivant en classe exceptionnelle
chore(docker): ajouter le volume nommé pour postgres
```

Un historique de commits propre est le meilleur outil de débogage pour
un projet solo — `git log --oneline` doit raconter une histoire lisible.

## Branches

Un projet solo n'a pas besoin d'un workflow Git élaboré :

- `main` : toujours déployable (les tests de la CI y passent).
- Une branche par fonctionnalité ou correctif :
  `feat/module-enseignants`, `fix/calcul-echelon-classe-exceptionnelle`.
- Fusion dans `main` seulement après que `npm run lint`,
  `npm run type-check` et les tests passent localement — la CI le
  revérifie de toute façon, mais autant ne pas lui faire perdre son
  temps.

## Couche domaine — la règle qui ne se négocie pas

Rien dans `src/domain` n'importe `src/lib/prisma` ni quoi que ce soit
de `react`/`next`. Si une fonction métier a besoin de données, elle les
reçoit en paramètre — c'est la Server Action ou le composant appelant
qui va les chercher via Prisma. C'est ce qui permet de tester les
règles d'avancement en quelques millisecondes, sans base de données.
