# Analyse de code — Système Pénombre

Revue de code complète du système Foundry VTT Pénombre, organisée en trois volets : CSS/HTML, JavaScript, et Architecture.

---

## 1. Revue CSS (LESS) / HTML (Handlebars)

### 1.1 Bugs CSS critiques

#### `padding: none` — valeur invalide
- **Fichier :** `styles/reserve-collegiale.less`, ligne 13
- `none` n'est pas une valeur acceptée par la propriété `padding`. Les navigateurs ignorent silencieusement cette déclaration.
- **Fix :** `padding: 0;`

#### `align-items: left` — valeur invalide
- **Fichier :** `styles/adversaire.less`, ligne 141
- `left` n'est pas valide pour `align-items` (valide pour `justify-content` ou `text-align`). La déclaration est ignorée.
- **Fix :** `align-items: flex-start;`

#### `.complication-case-2` jamais stylée
- **Template :** `templates/eminence/partials/conscience.hbs`, ligne 93
- La classe `.complication-case-2` est utilisée dans le template mais aucune règle CSS ne la cible. La classe `.complication-case` est stylée (width/height via `@small-case-size`), mais la variante `-2` n'a aucun style. Les images de complication en mode lecture s'affichent à leur taille intrinsèque au lieu de `20px × 20px`.
- **Fix :** Renommer en `.complication-case` dans le template, ou ajouter une règle :
```less
.complication-case-2 {
  width: @small-case-size;
  height: @small-case-size;
}
```

---

### 1.2 Accessibilité (WCAG)

#### Aucun style `:focus` / `:focus-visible`
- **Fichiers :** Tous les fichiers LESS (absence totale)
- Aucune règle `:focus` ou `:focus-visible` dans toute la codebase. Les images interactives (jetons, dés, complications) reçoivent des `data-action` mais aucun indicateur de focus clavier. Violation WCAG 2.1 niveau AA, critère 2.4.7 (Focus Visible).

#### `<label>` sans attribut `for`
- **Fichier :** `templates/dialogs/roll-dialog.hbs`, lignes 15, 32-33, 69
- Les 3 checkboxes (dé merveilleux, action collégiale, effet magique) ont un `<label>` adjacent sans `for` associé au `id` de l'input. Cliquer sur le texte du label ne coche pas la case. Violation WCAG 1.3.1.
- **Fix :**
```hbs
<input type="checkbox" id="deMerveilleux" name="deMerveilleux" />
<label for="deMerveilleux">{{ localize 'PENOMBRE.ui.plutotDeMerveilleux' }}</label>

<input type="checkbox" name="actionCollegiale" id="actionCollegiale" />
<label for="actionCollegiale">{{localize 'PENOMBRE.ui.actionCollegiale' }}</label>

<input type="checkbox" name="effetMagique" id="effetMagique" />
<label for="effetMagique">{{localize 'PENOMBRE.ui.effetMagique' }}</label>
```

#### `<select>` dissonance sans label
- **Fichier :** `templates/adversaire/partials/personnage.hbs`, ligne 28
- Le `<select>` pour l'harmonique de dissonance n'a aucun `<label>` associé. Un lecteur d'écran annonce un champ sans nom.
- **Fix :**
```hbs
<label for="dissonance-harmonique">{{localize "PENOMBRE.ui.harmonique"}}</label>
<select id="dissonance-harmonique" name="system.dissonance.harmonique">
  {{selectOptions harmoniquesChoices selected=systemSource.dissonance.harmonique}}
</select>
```

#### Images décoratives avec `alt=""`
- **Fichiers :** `eminence.hbs`, `personnage.hbs`, `conscience.hbs`, `harmoniques.hbs`
- Les images décoratives (frises) utilisent `alt=""`. Le lecteur d'écran lit "pipe" ou "barre verticale". Les images purement décoratives doivent utiliser `alt=""` pour être ignorées par les technologies d'assistance. Les images interactives (dés) devraient avoir un alt descriptif.

#### `<span>` pour les titres de section
- **Fichiers :** `templates/eminence/partials/pouvoirs.hbs:3`, `atouts.hbs:3`, `maitrises.hbs:3`
- Les titres de section (pouvoirs, atouts, maîtrises) sont des `<span>` rendus en `@font-size-2xlarge` (35px). Visuellement ce sont des headings, mais les lecteurs d'écran ne les intègrent pas dans le plan du document.
- **Fix :** Remplacer par `<h2>` ou `<h3>`.

#### Images interactives sans rôle ARIA
- **Fichiers :** `conscience.hbs`, `timbre.hbs`, `reserve-collegiale.hbs`, `harmoniques.hbs`
- Les `<img>` avec `data-action` agissent comme des boutons mais sont sémantiquement des images. Elles ne reçoivent pas le focus clavier.
- **Fix :** Ajouter `role="button"`, `tabindex="0"` et un `aria-label` descriptif, ou convertir en `<button>` contenant l'`<img>`.

---

### 1.3 HTML invalide

#### `<img></img>` — balise fermante sur void element
- **Fichiers :** `conscience.hbs` (8 occurrences), `timbre.hbs` (7), `reserve-collegiale.hbs` (1), `sidebar-menu.hbs` (1), `atouts.hbs` (1), `pouvoirs.hbs` (1)
- `<img>` est un void element HTML. La balise fermante `</img>` est invalide et peut perturber les parsers et outils d'accessibilité.
- **Fix :** Remplacer tous les `></img>` par `/>`.

---

### 1.4 Internationalisation (i18n)

#### ~~Chaînes françaises codées en dur~~ — Corrigé
- ~~`templates/adversaire/partials/actions.hbs` : `<h2>Actions adverses`, `<h2>Actions de dissonance`~~
- ~~`templates/adversaire/partials/intrigues.hbs` : `<h2>Intrigues`~~
- ~~`templates/dialogs/roll-dialog.hbs` : `Niveau : {{this.system.valeur}}`~~
- **Corrigé :** Clés `actionsAdverses`, `actionsDissonance` ajoutées dans `lang/fr.json`. Les 4 chaînes utilisent désormais `{{localize}}`.

---

### 1.5 Sécurité

#### Triple-stache `{{{...}}}` dans un attribut `data-tooltip`
- **Fichiers :** `pouvoirs.hbs:42`, `atouts.hbs:36`, `maitrises.hbs:42`
```hbs
<span class="item-name" data-tooltip="{{{item.system.description}}}">{{item.name}}</span>
```
- `item.system.description` contient du HTML (champ ProseMirror). Le triple-stache injecte du HTML brut dans un attribut, créant un vecteur d'injection potentiel.
- **Fix :** Utiliser le double-stache `{{item.system.description}}` pour échapper le HTML, ou un tooltip dédié pour le contenu riche.

---

### 1.6 Cohérence et maintenabilité CSS

#### `#917f35` codé en dur au lieu de `@color-accent`
- **Fichier :** `styles/eminence.less`, 8 occurrences (lignes 519, 564, 570, 808, 845, 948, 984, 1078, 1103)
- La variable `@color-accent: #917f35` existe. Si la couleur change, ces 8 bordures ne suivront pas.
- **Fix :** Remplacer par `border: 1px solid @color-accent;`

#### `font-family: "Cattedrale"` en dur
- **Fichiers :** `styles/chat.less` (lignes 45, 59, 73), `styles/dialog.less` (ligne 45)
- La variable `@font-cattedrale` est définie dans `penombre.less`.
- **Fix :** Utiliser `font-family: @font-cattedrale;`

#### `.participate-container` dupliqué
- **Fichier :** `styles/chat.less`, lignes 70-75 et 97-104
- Le même sélecteur apparaît deux fois avec des déclarations différentes. Les deux blocs s'appliquent simultanément par spécificité identique.
- **Fix :** Fusionner en un seul bloc :
```less
.participate-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  button {
    font-family: @font-cattedrale;
    font-size: 1rem;
    flex: 1;
    margin: 0 4px;
  }
}
```

#### `cursor: pointer` incohérent
- Chat et toggle-switch utilisent correctement `cursor: var(--cursor-pointer)` (respecte le setting Foundry). Tous les autres éléments interactifs utilisent `cursor: pointer` en dur.
- **Fix :** Adopter `var(--cursor-pointer)` partout.

#### `.absolue` dupliquée dans plusieurs fichiers
- **Fichier :** `styles/eminence.less` (lignes 704, 774, 915, 1044), `styles/reserve-collegiale.less` (ligne 44)
- La classe `.absolue { position: absolute; z-index: 5; }` est redéfinie dans chaque scope nested.
- **Fix :** Définir une seule fois dans `penombre.less` comme utility class.

#### Styles inline dans le template
- **Fichier :** `templates/dialogs/roll-dialog.hbs`, lignes 31, 36, 44, 67
- `style="display: none;"` sur des éléments qui ont déjà `display: none` dans `dialog.less`.
- **Fix :** Retirer les attributs `style` inline, s'appuyer sur le LESS.

---

### 1.7 Points mineurs CSS

#### `.section-style()` mixin : `flex-direction` sans `display: flex`
- **Fichier :** `styles/penombre.less`, lignes 94-100
- Le mixin applique `flex-direction: column` mais pas `display: flex`. La propriété est ignorée si le conteneur n'est pas flex par ailleurs.

#### `min-width: 635px` codé en dur
- **Fichier :** `styles/penombre.less`, mixin `.section-style-2()`, lignes 102-110
- Empêche toute réduction responsive. Devrait être une variable ou être documenté.

#### `text-wrap: auto` (CSS4, support limité)
- **Fichier :** `styles/chat.less`, ligne 48
- Propriété CSS Text Level 4 au support navigateur limité. Probablement redondante (c'est le comportement par défaut).

#### Sélecteurs sur-qualifiés
- **Fichier :** `styles/dialog.less`, lignes 179, 184
- `input[type="text"]#autreBonus` — un sélecteur `#id` a déjà la spécificité maximale.
- **Fix :** Simplifier en `#autreBonus`.

#### `height: 500px` codé en dur sur `.col-2`
- **Fichier :** `styles/eminence.less`, ligne 330
- La colonne décorative (frise) a une hauteur fixe. Si le contenu de la colonne 1 dépasse 500px, la frise ne suivra pas.

---

## 2. Revue JavaScript

### 2.1 Bugs critiques

#### `depenserJetons()` et `perdreUnJeton()` non `async`
- **Fichier :** `module/models/eminence.mjs`, lignes 251-265 et 274-306
- Ces méthodes appellent `this.parent.update(...)` (qui retourne une Promise) mais sont déclarées comme fonctions synchrones. Elles retournent `undefined`.
- Les appelants (`roll.mjs:192`, `harmonique-message.mjs:184`) font `await` sur `undefined` → résolution instantanée → l'update DB s'exécute en fire-and-forget. En cas de clics rapides, un joueur peut dépenser le même jeton deux fois.
- **Fix :**
```js
async depenserJetons(nbJetons) {
  // ...
  if (nbJetonsModifies > 0) {
    return this.parent.update({ "system.conscience.jetons": jetons })
  }
}

async perdreUnJeton() {
  // ...
  if (jetonPerdu) {
    return this.parent.update({
      "system.conscience.valeur": newConscience,
      "system.conscience.jetons": jetons,
    })
  }
}
```

#### XHR synchrone bloquant le thread principal
- **Fichier :** `penombre.mjs`, ligne 109
- `$.ajax({ async: false })` bloque le navigateur pendant toute la durée de la requête HTTP. Chaque MJ qui charge ou recharge la page subit un gel de l'interface.
- **Fix :**
```js
fetch(apiURL, {
  method: "POST",
  body: JSON.stringify(worldData),
  headers: { "Content-Type": "application/json; charset=utf-8" },
}).catch(() => {})
```

#### `_handleQueryMessageParticipation` : accès sans null guard
- **Fichier :** `module/documents/chat-message.mjs`, lignes 75-104
- Quand `answer === true`, `newMessage` est accédé sans vérification de nullité. Si le message n'a pas encore propagé chez le MJ (la query peut arriver avant l'événement socket de création), `newMessage` est `undefined` → `TypeError: Cannot read properties of undefined`.
- Le paramètre `nbSucces` est masqué par un `const nbSucces` déclaré plus bas (variable shadowed, jamais utilisée).
- **Fix :**
```js
if (answer) {
  if (!newMessage) {
    console.error("Pénombre | _handleQueryMessageParticipation : newMessage introuvable", newMessageId)
    return
  }
  const rollResults = PenombreRoll.analyseRollResult(newMessage.rolls[0])
  const nbSucces = rollResults.nbSucces
  // ...
}
```

#### `game.actors.get(id).name` sans null guard
- **Fichier :** `module/models/harmonique-message.mjs`, ligne 89
- Si un acteur est supprimé après une action collégiale, `game.actors.get(id)` retourne `undefined` → `.name` crashe → le rendu de ce message chat est définitivement cassé.
- **Fix :**
```js
actor: game.actors.get(id)?.name ?? game.i18n.localize("PENOMBRE.ui.acteurInconnu"),
```

#### Reroll : `die.total` jamais recalculé
- **Fichier :** `module/documents/roll.mjs`, lignes 813-829
- Après mutation de `results[resultIndex].result`, la propriété `die.total` conserve la somme originale. `analyseRollResult` utilise `die.total` (ligne 654) pour la détection envolée/fausse note, mais itère `die.results` pour le comptage des succès. Après un reroll, ces deux sources sont désynchronisées.
- **Fix :**
```js
roll.dice[dieIndex].results[resultIndex].result = parseInt(newDice.result)
roll.dice[dieIndex]._total = roll.dice[dieIndex].results
  .filter(r => !r.discarded)
  .reduce((sum, r) => sum + r.result, 0)
// Recalculer aussi roll._total
```

#### Missing `await` dans `PenombreCombat._onEnter`
- **Fichier :** `module/documents/combat.mjs`, lignes 3-6
- L'update du combatant est fire-and-forget → race condition avec le re-render du tracker (l'initiative peut s'afficher avec l'ancienne valeur avant de se corriger).
- **Fix :** `await combatant.update({ initiative: this.#getInitiative(combatant) })`

---

### 2.2 Bugs importants

#### `rollResultOtherDiv` sans null guard (2 occurrences)
- **Fichier :** `module/models/harmonique-message.mjs`, lignes 83 et 128
- `html.querySelector(".roll-result-collegiale")` peut retourner `null` si le template ne rend pas cet élément → `TypeError` sur `.innerHTML = content`.
- **Fix :** Ajouter `if (rollResultOtherDiv) rollResultOtherDiv.innerHTML = content`

#### Branche morte `type === "action"` dupliquée
- **Fichier :** `module/applications/sheets/adversaire-sheet.mjs`, lignes 65-74
- Le second `else if (type === "action")` est inatteignable (déjà matché avant). La branche `type === "description"` référence un type d'item inexistant.
- **Fix :** Supprimer les branches mortes.

#### Incohérence de casse `_adoptStyleSheet` / `_adoptStylesheet`
- **Fichiers :** `module/elements/adopted-style-sheet-mixin.mjs` vs `module/elements/checkbox.mjs`
- Le mixin définit `_adoptStyleSheet` (S majuscule). `CheckboxElement` override `_adoptStylesheet` (s minuscule). Le mixin est silencieusement bypassé.
- **Fix :** Standardiser la casse dans tous les fichiers.

#### `ToggleSwitchElement` crée `<track>` et `<thumb>`
- **Fichier :** `module/elements/toggle-switch.mjs`, lignes 36-41
- `<track>` est un élément HTML média (pour `<video>`/`<audio>`) avec une sémantique ARIA incorrecte dans ce contexte. `<thumb>` n'est pas un élément standard.
- **Fix :**
```js
const track = document.createElement("div")
track.classList.add("track")
const thumb = document.createElement("div")
thumb.classList.add("thumb")
```

#### Helper `times` : `first` et `last` toujours faux
- **Fichier :** `module/helpers/handlebars.mjs`, lignes 22-31
- La boucle commence à `i = 1`, mais `first` teste `i === 0` (jamais vrai) et `last` teste `i === n - 1` (off-by-one, la dernière itération est `i === n`).
- **Fix :**
```js
block.data.first = i === 1
block.data.last = i === n
```

#### `DIALOG_TEMPLATE` avec chemin erroné
- **Fichier :** `module/documents/roll.mjs`, ligne 10
- `static DIALOG_TEMPLATE = "modules/penombre/..."` — le préfixe est `modules/` au lieu de `systems/`. De plus, cette constante n'est jamais utilisée (code mort).
- **Fix :** Corriger le chemin et l'utiliser, ou supprimer.

---

### 2.3 Code quality

#### `await game.settings.get()` inutile (5 occurrences)
- **Fichiers :** `roll.mjs` (lignes 35, 215, 216, 729, 730), `reserve-collegiale.mjs` (lignes 48, 53)
- `game.settings.get()` est entièrement synchrone. `await` wraps la valeur dans une Promise résolue — inutile et trompeur.
- La ligne 35 de `roll.mjs` est particulièrement confuse :
```js
const maxJetonsReserve = await game.settings.get("penombre", "reserveCollegiale").nbJetonsRestants
```
Le chaînage `.nbJetonsRestants` se fait sur le retour synchrone, pas sur une Promise résolue.
- **Fix :** Retirer tous les `await` devant `game.settings.get()`.

#### `messageType` lu via `.innerHTML`
- **Fichier :** `module/documents/roll.mjs`, ligne 510
- `innerHTML` retourne le contenu HTML brut. Si le template ajoute du whitespace ou des enfants dans `.messageType`, la comparaison `!== "lie"` échouera silencieusement.
- **Fix :** Utiliser un `data-*` attribut et `dataset.messageType`.

#### Chaînes de statut en dur au lieu des constantes
- **Fichier :** `module/applications/sheets/eminence-sheet.mjs`, lignes 101-112 et 154-162
- `"actif"`, `"inactif"`, `"perdu"` codés en dur au lieu de `SYSTEM.JETON_STATUTS.actif.id`, etc.
- Les autres fichiers (`eminence.mjs` model) utilisent correctement les constantes.

#### Double vérification inutile dans `Macros.rollHarmonique`
- **Fichier :** `module/helpers/macros.mjs`, lignes 32-36
- `if (!actor) return` suivi de `if (actor) { ... }` — le second test est toujours vrai.

#### `_prepareContext` lit `_source` directement
- **Fichier :** `module/applications/sheets/eminence-sheet.mjs`, lignes 37-41
- `this.document.system._source.harmoniques.ame.valeur` bypasse le TypeDataModel et ses données préparées. Préférer `this.document.system.harmoniques.ame.valeur`.

#### `DEV_MODE = true` codé en dur, jamais utilisé
- **Fichier :** `module/config/system.mjs`, ligne 6
- Exporté sur `SYSTEM.DEV_MODE` mais jamais consommé. Le debug est contrôlé par `CONFIG.debug.penombre`.

#### Import mort de `PenombreRoll` dans `eminence.mjs`
- **Fichier :** `module/models/eminence.mjs`, ligne 2
- `PenombreRoll` est importé mais jamais référencé dans le fichier.

#### `Object.hasOwnProperty()` au lieu de `Object.hasOwn()`
- **Fichier :** `penombre.mjs`, ligne 160
- `hasOwnProperty` peut être masqué sur un objet. Le pattern moderne est `Object.hasOwn()`.

#### `onChange` de `nbJetons` ne peut pas empêcher le changement
- **Fichier :** `module/models/reserve-collegiale.mjs`, lignes 26-30
- Le callback `onChange` s'exécute après l'enregistrement du setting. L'affichage d'une erreur ne bloque pas le changement. L'application effective de la limite demo est faite dans le hook `updateSetting` de `penombre.mjs`, rendant le `onChange` redondant.

#### Hook `updateSetting` : récursion potentielle en mode demo
- **Fichier :** `penombre.mjs`, lignes 138-174
- En mode demo, si `nbJetons !== 10`, le handler force `await game.settings.set(SYSTEM.ID, "nbJetons", 10)` ce qui re-déclenche le même hook. La seconde exécution est correcte mais inutile.
- **Fix :** Ajouter un guard `if (nouveauNbJetons === update.value) return` ou restructurer.

#### Configuration Dice So Nice dans `adoptedCallback`
- **Fichier :** `module/elements/adopted-style-sheet-mixin.mjs`, lignes 24-25
- `_getStyleSheet()` est appelé deux fois au lieu de réutiliser la constante `sheet`.
```js
// Actuel
const sheet = this._getStyleSheet()
if (sheet) this._adoptStyleSheet(this._getStyleSheet())
// Fix
if (sheet) this._adoptStyleSheet(sheet)
```

---

### 2.4 Suggestions

#### `PenombreRoll.prompt` (300 lignes) devrait être découpé
- `_buildDialogContext()`, `_registerDialogListeners()`, `_applyDiceAppearance()` comme méthodes séparées.

#### Détection implicite d'action collégiale liée
- **Fichier :** `roll.mjs`, ligne 513
```js
const actionCollegialeLiee = dialogElement.querySelector("#actionCollegiale")?.checked === undefined
```
- Retourne `true` si la checkbox n'existe pas. Mécanisme implicite — préférer un `data-*` attribut sur la racine du dialog.

#### JSDoc manquant sur des méthodes publiques
- `Eminence.depenserJetons`, `Eminence.perdreUnJeton`, `PenombreRoll._updateNbJetons`, `PenombreRoll._updateFormula`, `PenombreRoll._checkCanRoll`, `HarmoniqueMessageData.addListeners`.

#### `diceSoNiceReady` : 270 lignes de données dupliquées
- Les tableaux de labels sont identiques entre les systèmes `penombre-sans` et `penombre` (sauf les faces d6 qui diffèrent sur l'envolée). Extraire en structure de données itérable.

---

## 3. Revue Architecture

### 3.1 God Class `PenombreRoll` (833 lignes)

**Fichier :** `module/documents/roll.mjs`

`PenombreRoll` cumule 7 responsabilités distinctes :
1. Prompt dialog et ses handlers HTML (12 méthodes statiques d'événements)
2. Construction de formule (`_updateFormula`)
3. Calcul du coût en jetons (`_updateNbJetons`, ~70 lignes de logique métier)
4. Dépense des jetons et dispatch de queries (lignes 184-192)
5. Configuration Dice So Nice — deux blocs complets, un dans `prompt()` et un dans `reroll()` (~160 lignes dupliquées)
6. Analyse des résultats (`analyseRollResult`)
7. Workflow de reroll (`reroll`, ~110 lignes)

Le calcul de coût dans `_updateNbJetons` encode les règles de jeu centrales (premier atout gratuit, interaction action collégiale, coût du niveau d'effet magique) et est enfoui dans un handler d'événement DOM lié au dialog. Ce code n'est pas testable unitairement sans rendre le dialog complet.

**Refactoring suggéré :**
```js
// Extraire en fonction pure testable
static calculateJetonCost({
  actionCollegiale,
  actionCollegialeLiee,
  premierAtout,
  nbAtouts,
  deMerveilleux,
  effetMagique,
  niveauEffet,
  niveauMaitrise,
}) { ... }

// Extraire en helper dédié
static _applyDiceAppearance(roll, options = {}) { ... }
```

Le dialog de jet mériterait d'être une vraie classe `ApplicationV2` avec `this.actor` en état interne, plutôt que 4 méthodes statiques qui résolvent l'acteur depuis le DOM à chaque événement.

---

### 3.2 Logique UI dans un TypeDataModel

**Fichier :** `module/models/harmonique-message.mjs`

`HarmoniqueMessageData` est un TypeDataModel — sa responsabilité est de définir le schéma de données et les propriétés calculées. Actuellement, il :
- Manipule directement le DOM (`querySelector`, `style.display = "none"`, `.innerHTML = content`) dans `alterMessageHTML()`
- Enregistre des event listeners dans `addListeners()`
- Rend des templates Handlebars
- Déclenche `actor.rollHarmonique()` depuis des clics sur boutons

Cela couple le schéma de données à l'interface de chat rendue. Pour modifier la structure du chat card, il faut éditer le model. Pour tester la logique de données, le DOM doit exister.

**Fix recommandé :** Déplacer `alterMessageHTML()` et `addListeners()` dans `PenombreMessage` (le document) :
```js
// Dans chat-message.mjs (PenombreMessage)
async renderHTML(options) {
  const html = await super.renderHTML(options)
  await this._alterCollegialeDisplay(html)
  this._addRollListeners(html)
  return html
}
```

---

### 3.3 Flux de jetons : dépense avant évaluation du jet

**Fichier :** `module/documents/roll.mjs`, lignes 184-192 vs ligne 300

```
Lignes 184-192 : jetons dépensés, query dispatch
  ↓
Ligne 300 : roll.evaluate()
```

Si `roll.evaluate()` échoue (formule malformée, erreur réseau), les jetons sont déjà perdus sans jet correspondant. L'acteur perd des ressources pour rien.

**Fix :** Dépenser les jetons après la création réussie du message, ou wrapper la séquence avec un mécanisme de rollback.

---

### 3.4 Race condition multi-utilisateur sur la réserve collégiale

**Fichiers :** `module/applications/reserve-collegiale.mjs`, `module/documents/roll.mjs`

Le pattern de dépense de jetons de réserve est un read-modify-write classique :
1. Le joueur envoie `game.users.activeGM.query("penombre.updateReserveCollegialeFromRoll", { nbJetons })`
2. Le MJ lit le setting actuel, dépense N jetons, écrit le résultat

Si deux joueurs déclenchent une dépense quasi-simultanément, les deux queries lisent le même état → les deux écritures réussissent → la seconde écrase la première → un jeton perdu silencieusement.

**Mitigation :** Implémenter une file d'attente côté MJ, ou un pattern de "coordinateur de dépense" sérialisé.

---

### 3.5 Race condition sur les actions collégiales

**Fichiers :** `module/documents/actor.mjs`, `module/models/harmonique-message.mjs`

Quand une action collégiale est initiée, `messagesLies` est construit à partir de `game.users.filter(...)` au moment de la création du message. Un joueur peut cliquer "participer" avant que le message ne soit pleinement persisté. Si l'état de connexion d'un utilisateur change entre le clic et la réponse de la query, la clé `messagesLies[actorId]` peut ne pas exister.

**Fix :** Ajouter une vérification défensive dans `_handleQueryMessageParticipation` :
```js
if (!message.system.messagesLies.hasOwnProperty(actorId)) return
```

---

### 3.6 Deux settings pour un seul état

Le nombre de jetons de réserve est gouverné par **deux** settings : `nbJetons` (le compte) et `reserveCollegiale` (l'objet état). La synchronisation se fait via le hook `updateSetting` dans `penombre.mjs` (lignes 145-174).

Problèmes :
- Si la sync échoue ou est bypassée (macro, module tiers), les deux sources divergent
- `validateKeys` dans `reserve-collegiale.mjs` hardcode le maximum à 10, ce qui rejette silencieusement les jetons au-delà

**Fix recommandé :** Stocker uniquement `reserveCollegiale` comme source de vérité. Dériver `nbJetons` via un getter sur le TypeDataModel. Supprimer le setting dupliqué.

---

### 3.7 Dépendance models → documents

**Fichiers :** `module/models/harmonique-message.mjs:3`, `module/models/eminence.mjs:2`

```
models/ ──imports──> documents/roll.mjs
documents/ ──imports──> models/
```

Les models ne devraient pas dépendre des documents (couche supérieure). `PenombreRoll.analyseRollResult()` est une fonction pure qui prend un objet roll — elle pourrait vivre dans `helpers/dice.mjs`, importable depuis les deux couches sans dépendance circulaire.

L'import dans `eminence.mjs` est mort (jamais référencé) et devrait être supprimé.

---

### 3.8 Schémas orphelins dans Eminence

**Fichier :** `module/models/eminence.mjs`, lignes 102-123

`schema.atouts` et `schema.maitrises` définissent des tableaux de données structurées directement sur le modèle d'acteur. Mais les atouts et maîtrises sont aussi des documents Item complets (`PenombreAtout`, `PenombreMaitrise`). Les sheets utilisent `this.document.itemTypes.atout` / `.maitrise` — pas les champs du schéma.

Ces champs semblent être du legacy qui a été supplanté par le système d'Items. Ils ajoutent du poids au schéma, apparaissent dans les exports, et peuvent confondre les développeurs.

**Fix :** Si confirmé inutilisé, supprimer et écrire une migration pour nettoyer les données orphelines.

---

### 3.9 Points positifs

- **Architecture globale propre** : séparation config / models / documents / sheets bien structurée
- **AppV2 + TypeDataModel partout** — utilisation cohérente des patterns Foundry v13 modernes
- **Système de queries (`CONFIG.queries`)** bien implémenté pour la communication MJ-joueur, avec 3 queries correctement enregistrées dans le hook `init`
- **`analyseRollResult`** est une fonction pure bien documentée, réutilisée de manière cohérente dans le codebase
- **`ReserveCollegiale` comme TypeDataModel dans un setting** — pattern élégant pour de l'état partagé avec validation de schéma
- **`_preCreate` avec `updateSource`** pour les defaults de token — approche Foundry v13 correcte
- **Barrel exports `_module.mjs`** bien organisés et faciles à naviguer
- **`AbortController`** dans `CheckboxElement` pour le cleanup des listeners — bon pattern anti-fuite mémoire
- **`DragDrop` avec permission callbacks** (`dragstart: () => game.user.isGM`) dans le combat tracker — pattern correct
- **Mixin `.item-mixin()`** dans `items.less` — les 5 sheets d'items partagent un layout identique via un seul mixin
- **Theme switching** (`body.theme-light`, `body.theme-dark`) correctement implémenté et cohérent
- **Scoping CSS du chat** — ancré dans `#interface #sidebar` pour éviter les fuites de styles
- **Grid responsive** pour les actions/intrigues de l'adversaire (`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`)

---

## Tableau récapitulatif par priorité

| Priorité | Problème | Fichier | Impact |
|----------|----------|---------|--------|
| Critique | Jetons dépensés avant `roll.evaluate()` | `roll.mjs` L184-300 | Perte de jetons sans jet |
| Critique | `depenserJetons` / `perdreUnJeton` non async | `eminence.mjs` L251-306 | Race condition, double-spend |
| Critique | Race condition multi-user sur réserve | `reserve-collegiale.mjs` | Jetons perdus silencieusement |
| Critique | XHR synchrone bloque le thread principal | `penombre.mjs` L109 | UI gelée, warning navigateur |
| Critique | `newMessage` sans null guard | `chat-message.mjs` L75 | Crash TypeError |
| Critique | `game.actors.get(id).name` sans null guard | `harmonique-message.mjs` L89 | Messages chat cassés définitivement |
| Critique | `die.total` pas recalculé après reroll | `roll.mjs` L813-829 | Détection envolée/fausse note fausse |
| Bug | `padding: none` invalide | `reserve-collegiale.less` L13 | Style ignoré |
| Bug | `align-items: left` invalide | `adversaire.less` L141 | Style ignoré |
| Bug | `.complication-case-2` jamais stylée | `conscience.hbs` L93 | Taille images incorrecte |
| Bug | Missing `await` dans `_onEnter` | `combat.mjs` L5 | Race condition initiative |
| Bug | Branche morte `type === "action"` dupliquée | `adversaire-sheet.mjs` L65-74 | Code mort |
| Bug | Casse `_adoptStyleSheet` vs `_adoptStylesheet` | `checkbox.mjs` / mixin | Mixin bypassé |
| Bug | `<track>` / `<thumb>` éléments non standard | `toggle-switch.mjs` L36 | Sémantique ARIA incorrecte |
| Bug | Helper `times` : `first`/`last` jamais vrais | `handlebars.mjs` L22-31 | Template logic cassée |
| Bug | `<label>` sans `for` sur 3 checkboxes | `roll-dialog.hbs` L15,32,69 | Label non cliquable |
| Bug | `{{{...}}}` dans `data-tooltip` | `pouvoirs.hbs` L42, etc. | Injection HTML |
| Bug | `<img></img>` void element fermé | 18+ templates | HTML invalide |
| Design | God class `PenombreRoll` (833 lignes) | `roll.mjs` | Maintenance, testabilité |
| Design | UI/DOM logic dans TypeDataModel | `harmonique-message.mjs` | Couplage, non testable |
| Design | Dépendance models → documents | `eminence.mjs` L2, `harmonique-message.mjs` L3 | Risque dépendance circulaire |
| Design | Deux settings pour un état | `penombre.mjs`, `settings.mjs` | Fragilité synchronisation |
| Design | Code DSN dupliqué (~160 lignes) | `roll.mjs` L218-298, L732-809 | Violation DRY |
| Maintenance | `#917f35` × 8 au lieu de `@color-accent` | `eminence.less` | Maintenance couleur |
| Maintenance | Chaînes statut en dur vs constantes | `eminence-sheet.mjs` L102, L155 | Fragile si rename |
| Maintenance | `DEV_MODE = true` inutilisé | `system.mjs` L6 | Config morte |
| Maintenance | Import mort `PenombreRoll` | `eminence.mjs` L2 | Code mort |
| Maintenance | Schémas `atouts`/`maitrises` orphelins | `eminence.mjs` L102-123 | Legacy confus |
| Maintenance | i18n : 4 chaînes françaises en dur | `actions.hbs`, `intrigues.hbs`, `roll-dialog.hbs` | Intraduisible |
| Maintenance | Aucun style `:focus` | Tous les LESS | Accessibilité |
| Maintenance | `DIALOG_TEMPLATE` chemin erroné + mort | `roll.mjs` L10 | Code mort trompeur |
| Maintenance | `await` sur `game.settings.get()` synchrone | 5 occurrences | Trompeur |
