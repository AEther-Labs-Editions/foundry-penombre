# Pénombre — Implémentation du « Jeu des Factions » v3.2

## Contexte

Le fichier `systems/penombre/source/Pénombre - Système Le Jeu des Factions v3-2.docx` (modifié aujourd'hui) est le document de conception à jour d'une extension optionnelle des règles : le **Jeu des Factions**. Il décrit une mécanique de relations entre le collège des Éminences grises et des groupes d'intérêt du monde, matérialisée par une « feuille collégiale ».

Une première implémentation existe déjà sur la branche git locale/distante `factions` (3 commits, dernier le 2026-05-03), **jamais fusionnée dans `main`**, et desynchronisée depuis (main a depuis refondu l'apparence des dés, ajouté la conversion jeton→complication individuelle en cours de jet, etc.). Cette branche couvre une version antérieure et plus simple de la fonctionnalité (pas de « Potentiel collégial », pas de dégradation d'atout sur fausse note/envolée).

Décisions actées avec l'utilisateur :
- **Reprendre la branche `factions`** comme socle (porter sa logique sur `main` actuel) plutôt que repartir de zéro.
- **Couvrir l'intégralité du document v3.2**, y compris les mécaniques qui n'existent dans aucune version du code (Potentiel collégial, dégradation d'atout, complication collégiale via jetons économisés).

Objectif : que le MJ et les joueurs puissent gérer des factions (créer, éditer, utiliser leurs atouts/complications dans les jets) avec l'intégralité des règles du document, sur la base de code actuelle.

## Ce que décrit le document (résumé fonctionnel)

- **Feuille collégiale** : 3 blocs — Réserve collégiale (jetons partagés, existe déjà), Relations (factions avec 1-3 atouts + 0-1 complication chacune), **Potentiel collégial** (nouvelle réserve de points pour créer des atouts en cours de partie).
- **Atouts/complications collégiaux** : mêmes règles que les atouts/complications individuels, sauf :
  - le jeton dépensé pour un atout collégial doit obligatoirement venir de la réserve collégiale (pas de la conscience personnelle) ;
  - en cas de **fausse note ou d'envolée**, le niveau d'un des atouts collégiaux utilisés (au choix des joueurs) baisse de 1 ; à 0 il est effacé ;
  - une complication collégiale peut être créée en cours de jet en échange de jetons économisés (comme le mécanisme individuel existant), mais elle s'applique à tout le groupe et peut aussi être imposée par le MJ (qui crédite alors la réserve d'autant de jetons que le niveau).
- **Création** : soit préalable (5 points d'atout + jusqu'à 3 points de complication à répartir), soit en cours de partie (5 points de Potentiel collégial, chaque atout créé coûte 1 point, +1 niveau gratuit si accompagné d'une complication).
- **Évolution en fin de scénario** : créer un atout, +1 niveau à un atout existant, ou effacer une case de complication (mis en réserve possible dans le Potentiel).
- **Ressource narrative** : mobiliser une faction pour agir hors-écran coûte 1 jeton de réserve + jet optionnel — ne nécessite aucun code nouveau, c'est un usage du dialogue de jet déjà étendu aux atouts de faction.
- **Contenu « Les factions »** : liste d'exemples de factions/atouts/complications pour inspiration MJ. C'est du contenu narratif (plusieurs sous-sections sont d'ailleurs encore vides dans le brouillon), **hors périmètre code** — à traiter séparément, par ex. sous forme de compendium Journal, si souhaité plus tard.

## État du code actuel (vérifié)

- Aucune trace de « faction » sur `main`. Le seul sous-système « collégial » existant est la Réserve collégiale (`module/models/reserve-collegiale.mjs`, setting world `reserveCollegiale`, appli `module/applications/reserve-collegiale.mjs` + `templates/reserve-collegiale.hbs`), un pool de 10 jetons partagés.
- Les atouts/complications **individuels** ont déjà un pattern réutilisable :
  - `atout` (Item) : `valeur` 0-3 (`module/models/atout.mjs`).
  - `eminence.system.conscience.complications` : 4 emplacements fixes, chacun `{description, valeur}` (`module/models/eminence.mjs:74-79` + `static createComplication()`).
  - Le dialogue de jet (`templates/dialogs/roll-dialog.hbs` + `module/documents/roll.mjs`) sait déjà : afficher les atouts d'un acteur et les cocher pour ajouter des d6 (`_onToggleAtout`), répartir le coût en jetons entre conscience et réserve (`_updateNbJetons`, champs `jetonsConscience`/`jetonsReserve`), et **convertir des jetons économisés en une nouvelle complication individuelle** en cours de jet (`hasComplicationLibre`, `#complicationUse`, `_onToggleComplication`, écriture finale dans `actor.system.conscience.complications`). Ce dernier mécanisme est l'exact pendant individuel de ce que le document demande au niveau collégial.
  - Les conséquences de fausse note/envolée sur les jetons de conscience sont appliquées juste après le jet dans `PenombreActor.rollHarmonique()` (`module/documents/actor.mjs:54-72`), et dupliquées dans `PenombreRoll.reroll()` pour le cas de relance. C'est le point d'accroche naturel pour la dégradation d'un atout collégial.
- La branche `factions` (à porter) ajoute, sur une version antérieure de ces fichiers : un champ `factions` sur `reserveCollegiale` (nom, atouts `{nom, valeur 1-3}` max 3, complications `{nom, valeur 1-3}` max 1), un setting `utiliserFactions`, le CRUD complet (créer/renommer/supprimer faction et éléments, avec bascule lecture/édition MJ et requêtes `CONFIG.queries` pour les joueurs, sur le modèle déjà en place pour les jetons de réserve), l'affichage des atouts de faction dans le dialogue de jet, et des helpers Handlebars `range`/`lte` (absents de `main`). Aucun de ces fichiers ne peut être fusionné tel quel (le diff `main...factions` fait ~1100 lignes à cause de la dérive de `main`) : il faut reporter la logique faction spécifiquement, à la main, sur les fichiers actuels.

## Modifications à apporter

### 1. Socle Factions (porté depuis la branche `factions`, adapté à `main` actuel)
- `module/models/reserve-collegiale.mjs` : ajouter le champ `factions` (`TypedObjectField` : nom, atouts `{nom, valeur 1-3}` max 3 clés, complications `{nom, valeur 1-3}` max 1 clé) + getters `allFactionAtouts`/`allFactionComplications` (repris de la branche).
- `module/helpers/settings.mjs` : nouveau setting world `utiliserFactions` (Boolean, config: true, `requiresReload: true`) ; étendre le `default` du setting `reserveCollegiale` avec `factions: {}` et `potentiel: 0` (voir §2).
- `module/applications/reserve-collegiale.mjs` : porter les actions CRUD (`createFaction`, `deleteFaction`, `createFactionAtout`, `createFactionComplication`, `deleteFactionElement`, `changeFactionElementValeur`, renommage via `blur`), les limites (3 atouts / 1 complication, avertissement i18n), le mode édition MJ (réutiliser le pattern `SHEET_MODES`/toggle déjà utilisé par `PenombreBaseActorSheet`), et les query handlers correspondants (mêmes noms que la branche : `penombre.createFaction`, etc.) pour les écritures joueurs.
- `templates/reserve-collegiale.hbs` : porter la section factions (liste pliable, pips niveau via images `de_case_*`/`transp_case_*`), dans le wrapper `.reserve-wrapper`.
- `styles/reserve-collegiale.less` : porter/adapter le style des factions.
- `module/helpers/handlebars.mjs` : ajouter les helpers `range` et `lte` (absents de `main`, nécessaires aux pips).
- `penombre.mjs` : enregistrer les nouvelles `CONFIG.queries` pour les factions (hook `init`, à côté des queries réserve existantes).
- `lang/fr.json` : clés `PENOMBRE.Factions.*` et `PENOMBRE.Settings.utiliserFactions.*`.
- `module/documents/roll.mjs` + `templates/dialogs/roll-dialog.hbs` : ajouter la section « Atouts de faction » à côté des atouts personnels (visible seulement si `utiliserFactions` et style de jeu ≠ démo), **sans supprimer** le mécanisme individuel de complication-contre-jetons déjà présent sur `main` (contrairement à la branche `factions`, qui datait d'avant son ajout et qu'il ne faut pas régresser).

### 2. Potentiel collégial (nouveau, absent de toute version du code)
- `module/models/reserve-collegiale.mjs` : `potentiel: NumberField({min: 0, initial: 0, integer: true})`.
- `reserve-collegiale.hbs`/`.mjs` : cartouche d'affichage (lecture pour les joueurs, éditable par le MJ, même pattern que le cartouche jetons).
- `#onCreateFactionAtout` (et son query handler) : coûte 1 point de potentiel (bloqué si `potentiel <= 0`, message d'avertissement dédié) ; option à la création « avec une complication » qui crée l'atout au niveau 2 et ajoute/incrémente en même temps une complication sur la même faction, pour le même coût de 1 point.
- Le Potentiel est aussi crédité par l'évolution de fin de scénario (§4) quand le groupe choisit de le mettre en réserve plutôt que de dépenser son choix immédiatement.

### 3. Dégradation d'un atout collégial (fausse note / envolée) — nouveau
- Dialogue de jet (`roll.mjs` côté client) : les atouts de faction cochés doivent être identifiés individuellement (pas seulement sommés comme les atouts personnels) — sérialiser la sélection (`factionId`/`elementId`) dans un champ caché synchronisé à chaque clic (comme `bonusAtouts` l'est déjà), puis le récupérer dans `PenombreRoll.prompt()` pour le stocker dans `rollOptions.factionAtoutsUsed`.
- `module/documents/actor.mjs` (`rollHarmonique`) et `PenombreRoll.reroll()` : là où la fausse note/l'envolée sont détectées, si `roll.options.factionAtoutsUsed` est non vide et que les factions sont activées : proposer un choix (auto si un seul atout utilisé, sinon une petite `DialogV2` de sélection) puis appliquer la baisse de niveau via une nouvelle query GM (`penombre.decrementFactionAtout`), qui supprime l'atout s'il atteint 0 — miroir du pattern déjà utilisé pour les jetons de réserve.
- Point d'implémentation à trancher en cours de dev : la règle « 1 jeton au-delà du premier atout » compte tous les atouts (personnels + faction) ensemble, mais le document impose que **si** un atout de faction consomme un jeton, ce jeton vienne de la réserve. `_updateNbJetons`/`_checkCanRoll` (`roll.mjs`) devront donc imposer un minimum de `jetonsReserve` égal au nombre d'atouts de faction effectivement facturés (en priorisant, par convention, l'atout gratuit sur un atout personnel s'il y en a un sélectionné).

### 4. Complication collégiale via jetons économisés — nouveau
- Étendre le fieldset existant `complication-fieldset` (`roll-dialog.hbs`, actif via `hasComplicationLibre`) avec un sélecteur de cible : « Moi » (comportement actuel, inchangé) ou « Faction : [liste déroulante] », visible seulement si `utiliserFactions` est actif.
- `roll.mjs` : si la cible est une faction, écrire (via query GM, comme pour la réserve) dans `reserveCollegiale.factions[x].complications` — créer l'emplacement unique de la faction ou augmenter son niveau (max 3) s'il existe déjà, plutôt que d'aller chercher un slot vide comme pour les complications individuelles.
- Complication imposée par le MJ (hors jet) : dans le mode édition de `reserve-collegiale.mjs`, ajouter une option MJ-only lors de la création/modification d'une complication de faction, créditant automatiquement la réserve collégiale d'autant de jetons que le niveau choisi.

### 5. Évolution de fin de scénario — essentiellement une réutilisation de l'UI existante
- Pas de nouveau déclencheur automatique (Foundry n'a pas de notion de « fin de scénario ») : le MJ utilise directement l'UI de §1 pour créer un atout, augmenter son niveau, ou faire baisser une complication.
- Seul ajout nécessaire : quand une complication de faction passe à un niveau qui atteindrait 0 (clic sur le pip 0/décrément), supprimer l'entrée automatiquement (`#onChangeFactionElementValeur`) — comportement demandé explicitement par le document (« une complication dont toutes les cases sont décochées est retirée »).
- Le choix « mettre le point en réserve » alimente simplement le Potentiel collégial (§2).

## Hors périmètre / à part

- Le contenu narratif « Les factions » (exemples de factions/atouts/complications du monde, plusieurs sections encore vides dans le brouillon) : contenu, pas du code. À traiter séparément (ex. compendium Journal) si l'utilisateur le souhaite.
- La répartition initiale « création préalable » (5 pts atout / 3 pts complication) : pas d'assistant dédié prévu, le MJ utilise l'UI de §1 à la main ; on pourra ajouter un simple compteur de points dépensés/restants en mode édition si utile, mais ce n'est pas un prérequis fonctionnel.

## Vérification

- `npx eslint .` dans `systems/penombre/` après chaque étape.
- `npx gulp css` pour recompiler `styles/reserve-collegiale.less` et `dialog.less` après modification.
- Test manuel en jeu (Foundry V14, monde Pénombre) :
  1. Activer le setting `utiliserFactions`, créer 2-3 factions avec atouts/complications en mode édition MJ.
  2. Vérifier les limites (3 atouts / 1 complication par faction) et le rendu joueur en lecture seule.
  3. Lancer un jet avec un atout de faction coché : vérifier le d6 ajouté, l'obligation de jeton de réserve, et la carte de résultat.
  4. Provoquer une fausse note puis une envolée sur un jet utilisant un atout de faction : vérifier la baisse de niveau (et la suppression à 0).
  5. Créer une complication collégiale via jetons économisés pendant un jet, puis via l'action MJ « imposée » (vérifier le crédit de jetons à la réserve).
  6. Dépenser un point de Potentiel collégial pour créer un nouvel atout, avec et sans l'option « avec complication ».
