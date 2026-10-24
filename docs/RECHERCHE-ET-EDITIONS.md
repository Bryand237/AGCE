# Recherche multicritères et éditions

Ce document décrit ce que font la page **Enseignants** (recherche, filtres, exports de la
sélection) et la page **Éditions** (listes officielles par établissement), les règles de calcul
retenues, et ce qui reste à faire valider par le client. Il s'adresse à la personne qui utilise
l'application comme à celle qui la fait évoluer.

Aucune de ces fonctions ne modifie la base de données : tout est calculé à la lecture.

## 1. Recherche multicritères (page Enseignants)

### Utilisation

- **Raccourcis** (en haut de la liste) : un clic applique un ensemble de critères courants.
  « Retraite dépassée », « Retraite 2026 », « Retraite 2027 », « Retraités », « Avancement échu »,
  « Avancement 2026 », « Avancement 2027 », « Absents en ce moment », « Absences à venir »,
  « Retour non enregistré ». Les années suivent le jour courant.
- **Filtres avancés** (panneau repliable) : plusieurs critères se combinent (ET logique).
- **Puces** : chaque critère actif apparaît sous forme de puce ; un clic sur la puce la retire,
  « Tout effacer » remet la liste à zéro.
- **Tri** : en cliquant sur l'en-tête d'une colonne (nom, grade, établissement, statut, retraite,
  avancement). À égalité, l'ordre est toujours nom, prénom, identifiant, donc stable.
- **Pagination** : 20 enseignants par page, les filtres sont conservés d'une page à l'autre.
- Toute la recherche vit dans l'adresse de la page : une adresse copiée ou enregistrée redonne
  exactement la même sélection.

### Critères disponibles

| Groupe                      | Critères                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Texte libre                 | Chaque mot doit se retrouver dans le nom, le prénom, le matricule, le domaine ou le lieu. Insensible aux accents et à la casse.              |
| Identité et situation       | Statut (actif, transféré, retraité), grade, genre, résident (oui/non), contrat de collaboration (oui/non), poste de responsabilité (oui/non) |
| Affectation et origine      | Établissement, département d'affectation, région d'origine, département d'origine                                                            |
| Position                    | Classe, échelon, indice (minimum et maximum)                                                                                                 |
| Dates                       | Naissance et prise de service : une année, ou une période « du … au … »                                                                      |
| Retraite et avancement      | Date de retraite et date d'avancement d'échelon : échéance « déjà passée » / « à venir », une année ou une période                           |
| Absences (missions, congés) | Avec / sans absence, état (en cours, à venir, retour non enregistré, terminée), type, début, fin prévue, « absent pendant la période »       |

### Règles de calcul

- **Date de retraite** : pour un retraité, la date réellement enregistrée ; pour un actif, la
  date théorique (naissance + âge de retraite du grade : assistant 55 ans, chargé de cours
  60 ans, maître de conférences et professeur 65 ans) ; **aucune** pour un transféré.
- **Date d'avancement** : la date où l'enseignant actif devient éligible à l'échelon suivant.
  Aucune pour un retraité, un transféré, ni pour un actif au dernier palier de sa grille.
- **« Déjà passée »** : la date est atteinte, **aujourd'hui compris**. **« À venir »** :
  strictement après aujourd'hui.
- Un enseignant **sans date** (transféré pour la retraite, par exemple) ne correspond à aucun
  critère de date renseigné.
- **État d'une absence** : calculé à partir de ses dates et de la date de retour, **jamais** lu
  dans le champ « statut » de la base (qui ne suit pas le temps). Terminée = retour enregistré ;
  à venir = début après aujourd'hui ; dépassée (« retour non enregistré ») = fin prévue passée sans
  retour ; en cours = le reste.
- Tous les critères d'absence portent sur **la même absence** : « Mission » + « en cours »
  cherche une absence qui est à la fois une mission et en cours.
- Les dates sont enregistrées à minuit UTC et calculées en UTC : aucun décalage d'un jour.

### Paramètres d'adresse

Utiles pour enregistrer une recherche ou construire un lien. Une valeur absente ou invalide est
ignorée, la page ne plante jamais.

`recherche`, `statut`, `grade` (plusieurs valeurs possibles, séparées par des virgules), `sexe`
(M/F), `etablissement`, `departement`, `region`, `origine` (identifiants), `resident`,
`collaboration`, `responsabilite` (oui/non), `classe`, `echelon`, `indiceMin`, `indiceMax`,
`naissanceAnnee|Du|Au`, `priseServiceAnnee|Du|Au`, `retraiteEcheance` (passee/future),
`retraiteAnnee|Du|Au`, `avancementEcheance`, `avancementAnnee|Du|Au`, `absence` (oui/non),
`absenceEtat`, `absenceType`, `absenceDebutAnnee|Du|Au`, `absenceFinAnnee|Du|Au`,
`absencePendantAnnee|Du|Au`, `trier`, `ordre` (asc/desc), `page`.

### Exports de la sélection

- **Exporter PDF** (en-tête de la page) : le fichier officiel de tous les enseignants.
- **Exporter cette sélection** (sous les filtres) : **PDF** (même mise en page que le fichier
  officiel, une page par établissement, grades regroupés, rappel des critères et de la date) et
  **Excel (CSV)** (UTF-8, séparateur « ; », ouvre directement dans Excel). Ils exportent
  exactement la sélection affichée, **toutes les pages**, avec le même tri.

## 2. Éditions (page Éditions)

Listes officielles demandées par l'administration, **classées par établissement** (ordre
alphabétique, une page ou plus par établissement), en PDF paysage et en CSV. Chaque liste affiche
sur la page son **décompte par établissement**, calculé sur la même sélection que le fichier. Sur
le PDF, le grade et la région d'origine sont abrégés (PR, MC, CC, ASS ; OU, CE…) avec une légende en
bas de page qui n'explique que les sigles présents. Dans le CSV, tout est écrit en entier et une
colonne « Établissement » est ajoutée en tête.

| Liste                                           | Qui y figure                                                                                                                                               | Colonnes propres à la liste                                                                                                                                      | Adresse                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Enseignants à la retraite                       | Ceux dont la date de retraite tombe dans l'année choisie (réelle pour un retraité, calculée pour un actif). Jamais un transféré. Du plus tôt au plus tard. | Date de retraite                                                                                                                                                 | `/editions/retraite/pdf?annee=2027` (et `/csv`) |
| Enseignants transférés                          | Statut « transféré ». Par nom.                                                                                                                             | Date de transfert (= date de fin de service du dossier), université d'accueil (= lieu de transfert)                                                              | `/editions/transferes/pdf` (et `/csv`)          |
| Enseignants sous contrat de collaboration       | Actifs et retraités dont le dossier porte un contrat de collaboration. Pas les transférés. Par nom.                                                        | Date de début et date de fin de la collaboration (**vides**, voir § 3)                                                                                           | `/editions/collaboration/pdf` (et `/csv`)       |
| Enseignants en congé de maternité ou de maladie | Enseignants **en activité** dont un congé de ce type est en cours, ou dont la fin prévue est passée sans retour enregistré. Du plus ancien au plus récent. | Date de début et de fin du congé. Le PDF sépare maternité et maladie par un bandeau ; le CSV ajoute « Type de congé ». **Aucun motif n'est imprimé ni exporté.** | `/editions/conges/pdf` (et `/csv`)              |
| Enseignants en mission                          | Enseignants **en activité** dont une mission est en cours, ou dont la fin prévue est passée sans retour enregistré. Du plus ancien au plus récent.         | Date de début et de fin de la mission, « Lieu d'accueil / motif » (**le motif saisi**, voir § 3)                                                                 | `/editions/missions/pdf` (et `/csv`)            |
| Enseignants décédés                             | **Indisponible** : la carte est affichée désactivée avec sa raison (voir § 3).                                                                             | Date de décès                                                                                                                                                    | —                                               |

Les colonnes communes, dans l'ordre : nom et prénom, date et lieu de naissance, matricule solde,
grade, sexe, domaine de recherche, département d'attache, date de prise de service, puis les
colonnes propres à la liste, puis région et département d'origine.

Une liste d'absences a **une ligne par absence** (un enseignant qui aurait deux congés en cours y
figure deux fois) ; le décompte et le sous-titre comptent les enseignants, pas les lignes.

Une **année invalide ou absente** dans l'adresse d'un téléchargement est refusée (erreur 400 avec
le motif) au lieu d'être remplacée : un document imprimé porte son année dans son titre. Une liste
inconnue répond 404. Sur la page Éditions, en revanche, l'année du formulaire revient à l'année en
cours si elle est invalide (ce n'est qu'une valeur de départ).

## 3. Limites de la base et hypothèses à faire valider par le client

La base de données de ce site est figée : elle ne se modifie pas sans l'accord de son
propriétaire. Trois demandes du client ne peuvent donc pas être satisfaites à l'identique, et
quelques règles ont été choisies par défaut.

| Sujet                                          | Ce que fait l'application aujourd'hui                                                                                                                                          | Ce qu'il faudrait pour mieux faire                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Décès**                                      | La liste des décédés est affichée **désactivée**. Aucun statut « décédé », aucune date de décès en base.                                                                       | Ajouter un statut « décédé » et une date de décès au dossier. La liste se construit ensuite comme les autres. |
| **Dates du contrat de collaboration**          | La base ne connaît que « oui/non ». Les colonnes « début » et « fin » sont dans la liste mais **vides** (à compléter à la main ou dans Excel) ; un avertissement est affiché.  | Deux champs « date de début » et « date de fin » sur le dossier.                                              |
| **Mission « à l'étranger » et lieu d'accueil** | La liste reprend **toutes** les missions en cours ; la colonne « Lieu d'accueil / motif » reproduit le motif saisi. Le titre imprimé est « en mission », pas « à l'étranger ». | Un champ « lieu » (ou « à l'étranger ») sur les absences de type mission.                                     |
| Congés et missions : qui figure ?              | Absences **en cours aujourd'hui**, y compris celles dont la fin prévue est passée sans retour enregistré ; enseignants en activité seulement.                                  | Si le client préfère une année ou une période, ajouter un paramètre comme pour la liste des retraites.        |
| Retraites : qui figure ?                       | Date de retraite dans l'année, réelle (retraité) ou calculée (actif) ; jamais un transféré.                                                                                    | À confirmer avec le client, notamment pour les retraités d'une année passée.                                  |
| Contrats de collaboration et transférés        | Un transféré n'apparaît pas dans la liste de collaboration (il a quitté l'université).                                                                                         | À confirmer.                                                                                                  |
| Mise en page                                   | Paysage, une page (ou plus) par établissement, sans bandeau de grade, sigles expliqués en bas. Reprend les colonnes du cahier des charges.                                     | Ajuster sur retour du client.                                                                                 |

## 4. Pour les développeurs

### Architecture

- **Un seul chargement** (`src/lib/enseignants/chargerDossiers.ts`) : tous les enseignants,
  aplatis en `DossierEnseignant`. Tout le reste est **pur**, en mémoire et testé : filtrage
  (`src/domain/enseignants/recherche`), situation de carrière (`situation.ts`), états d'absence
  (`src/domain/absences`), éditions (`src/domain/editions`).
- **Même sélection partout** : l'écran, le PDF et le CSV passent par `selectionnerDossiers()`
  (ou `selectionnerEdition()` pour les éditions). Ce qu'on exporte est ce qu'on voit.
- **Mise en page PDF** : cadre commun `src/lib/pdf/liste/documentListe.ts` (colonnes en
  millimètres ramenées à la largeur de la feuille, cellules qui passent à la ligne, tout est
  échappé). Chaque liste décrit seulement ses colonnes et ses sections.
- **Éditions** : `src/domain/editions` (clés, titres, paramètres, sélection), `src/lib/editions`
  (colonnes, PDF, CSV, chargement), `src/app/(dashboard)/editions` (page et routes
  `[edition]/pdf|csv`).
- Le domaine (`src/domain`) n'importe ni Prisma, ni React, ni Next.
- Les dates sont à minuit UTC et lues en UTC (`src/domain/dates/jourCivil.ts`).

### Sécurité

- Le proxy (`src/proxy.ts`) exige une session pour tout sauf la page de connexion.
- Chaque route de téléchargement refuse en plus elle-même une requête sans session
  (`refuserSiNonConnecte()`), avant de lire la base ou de fabriquer un document.
- Les exports CSV neutralisent les cellules qui commenceraient par `=`, `@` ou un signe `+`/`-`
  suivi de texte (injection de formule dans Excel) ; les numéros de téléphone `+237 …` sont gardés.

### Ajouter une liste dans les éditions

1. `src/domain/editions/editions.ts` : une clé dans `CLES_EDITION`, un cas dans `DemandeEdition`,
   `DEFINITIONS_EDITION`, `lireDemandeEdition`, `titreEdition`, `messageEditionVide`,
   `selectionnerEdition`, `radicalFichier`. Le compilateur signale ce qui manque : chaque
   `switch` est exhaustif.
2. `src/lib/editions/colonnes.ts` : ses colonnes propres dans `colonnesPropres`.
3. `src/app/(dashboard)/editions/page.tsx` : une carte de plus.
4. Tests à côté de chaque fichier. Les routes et leur contrôle d'accès sont couverts par
   `editions-acces.test.ts` : ajouter la clé aux listes `it.each`.

### Tests

`npm run test:run` lance tous les tests. Les tests de la recherche et des éditions n'ont besoin
ni de la base ni du navigateur ; seuls les PDF réels passent par Chromium (`genererPdf`), et les
tests le remplacent par un faux.
