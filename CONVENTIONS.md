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

## Messages à l'utilisateur : fenêtres, alertes, notifications

Jamais `confirm()`, `alert()` ni `prompt()` : ils sont laids, bloquent le navigateur, ne se
testent pas et ne disent rien de précis. Les composants de `src/components/ui/` les remplacent.

| Situation                                                      | Composant                                         |
| -------------------------------------------------------------- | ------------------------------------------------- |
| Saisie invalide dans un champ                                  | Texte d'erreur sous le champ (`state.errors`)     |
| Une action vient d'échouer (base arrêtée, doublon, interdit…)  | `<Alerte ton="erreur">` à côté du bouton          |
| Une action vient de réussir                                    | Notification (toast), qui disparaît seule         |
| Action destructrice, irréversible ou lourde de conséquences    | Fenêtre de confirmation (`useConfirmation`)       |
| État durable de la page (retraite dépassée, absence en retard) | `<Alerte>` fixe, dans la page                     |

**Confirmer.** Le formulaire garde son action serveur et son état d'attente ; on lui ajoute
`useConfirmation` (voir l'exemple en tête de `confirmation.tsx`). Le texte suit trois règles :

1. Le titre est une question précise : « Supprimer cette absence ? », pas « Êtes-vous sûr ? ».
2. La description dit ce qui sera perdu ou changé, et si cela peut se défaire.
3. Le bouton de confirmation reprend le verbe de l'action (« Supprimer l'absence »), jamais
   « Oui » ni « OK ».

Le `ton` suit la gravité :

- `danger` : l'action détruit des données (suppressions) ;
- `avertissement` : l'action ne se défait pas sans rien détruire (signer, valider, rétablir) ;
- `neutre` : on peut la corriger ensuite (transfert, retraite, réactivation).

Les deux premiers sont annoncés comme une alerte, le focus part sur « Annuler » et un clic à côté
ne ferme pas la fenêtre. Pour une signature ou une validation, `recapitulatif` relit à
l'utilisateur ce qu'il vient de saisir (date, numéro, auteur) : c'est le dernier moment pour voir
une faute de frappe qu'on ne pourra plus corriger. Jamais de mot de passe dans un récapitulatif.

**Ne pas empiler les avertissements.** Une action courante qui se défait facilement n'a pas besoin
de confirmation : à force de demander, on obtient des clics machinaux, y compris sur les
questions qui comptent.

**Échec d'une action** : la fenêtre se ferme et le message d'erreur s'affiche dans le formulaire,
au même endroit que les autres erreurs. La saisie n'est jamais perdue (voir `useActionConservee`).

**Comportements propres à `<dialog>`** (arrière-plan inerte, Échap, focus qui revient au bouton
d'origine) viennent du navigateur : les tests jsdom ne les voient pas, ils se contrôlent à la main
(liste de contrôle dans le message du commit « fenêtres de confirmation »).
