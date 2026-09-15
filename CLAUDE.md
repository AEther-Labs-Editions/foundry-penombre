# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foundry Virtual Tabletop game system for "Pénombre", a French fantasy TTRPG by Æther Labs set in the "Royaumes crépusculaires" (based on novels by Mathieu Gaborit). Requires Foundry VTT v13.

## Build Commands

```bash
cd systems/penombre/
npx gulp           # Compile LESS and watch for changes (default dev workflow)
npx gulp css       # One-time LESS compilation only
npm run LDBtoYML   # Export LevelDB compendium packs to YAML (src/packs/)
npm run YMLtoLDB   # Import YAML back to LevelDB (packs/)
```

Build process: `styles/penombre.less` → `css/penombre.css` (via Gulp + gulp-less). Always compile after modifying `.less` files.

No test suite configured. ESLint available: `npx eslint .`

## Code Style

- **Semicolons required** — enforced by ESLint `semi` rule
- **180 character line width** — Prettier `printWidth: 180`
- **Double quotes** — `"string"` not `'string'`
- **2-space indent**, no tabs
- **No trailing commas** — `comma-dangle: never`
- **Arrow parens**: only when needed (`as-needed`)
- **Capitalized comments** — ESLint enforces first letter uppercase
- **ES6+ modules**: `import`/`export`, arrow functions, `async`/`await`
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes
- **JSDoc** required for public exports (jsdoc plugin active)
- **No jQuery** for DOM manipulation (vanilla JS)
- **French variable names** used throughout (harmonique, jeton, pouvoir, atout, etc.)

## Architecture

**Entry Point:** `penombre.mjs` — Initializes via Foundry `init` hook. Exposes `game.system.api` with applications, models, documents, helpers.

**Global:** `SYSTEM` is a global (`globalThis.SYSTEM`) defined in `module/config/system.mjs`.

### Module Structure

| Directory | Purpose |
|-----------|---------|
| `module/config/` | System constants (`SYSTEM` object): harmonique values, jeton statuses, difficulty levels, people/gamme/ton enums |
| `module/models/` | TypeDataModel classes for actors, items, and chat messages |
| `module/documents/` | Extended Foundry Document classes (PenombreActor, PenombreItem, PenombreMessage, PenombreRoll, PenombreCombat) |
| `module/applications/sheets/` | Actor and item sheet UI classes (all AppV2) |
| `module/applications/` | Reserve collégiale window, sidebar menu, combat tracker |
| `module/helpers/` | Settings, Handlebars helpers, macros |
| `module/elements/` | Custom HTML web components (checkbox, toggle-switch) |
| `module/hooks/` | Foundry hook handlers (chat message rendering) |

### Document Types

- **Actors:** `eminence` (player character), `adversaire` (NPC)
- **Items:** `pouvoir` (power), `atout` (asset), `maitrise` (magical mastery), `action`, `intrigue`
- **ChatMessages:** `harmonique` (roll messages)

### Sheet Pattern

All sheets use **AppV2** with `HandlebarsApplicationMixin`. Base classes:
- `PenombreBaseActorSheet` extends `HandlebarsApplicationMixin(ActorSheetV2)` — play/edit mode toggle via `penombre-toggle-switch` element
- `PenombreBaseItemSheet` extends `HandlebarsApplicationMixin(ItemSheetV2)` — enriches HTML description

### Templates

Handlebars templates in `templates/`:
- `eminence/` — Character sheet with partials (atouts, conscience, harmoniques, maitrises, personnage, pouvoirs, recapitulatif, timbre)
- `adversaire/` — NPC sheet with partials (actions, intrigues, personnage)
- `chat/` — Roll result (`harmonique-roll.hbs`), collegial action, dice tooltip
- `dialogs/` — Roll dialog (`roll-dialog.hbs`)
- Root-level item sheets: `pouvoir.hbs`, `atout.hbs`, `maitrise.hbs`, `action.hbs`, `intrigue.hbs`

### Styles

LESS in `styles/`, compiled to `css/penombre.css`. Entry point: `styles/penombre.less` (imports all, defines variables, fonts, mixins).

Key variables: `@color-primary` (#a56135 brown), `@color-accent` (gold), `@font-cattedrale`, `@font-chocolate`, `@dice-size` (85px).

### Localization

`lang/fr.json` only (English entry in system.json points to fr.json). Keys prefixed `PENOMBRE.*`.

## Game Mechanics — Dice System

### Harmoniques (Core Attributes)

5 harmoniques: `ame`, `esprit`, `etincelle`, `nature`, `nuit` — each maps to a die (d4, d6, d8, d10, or d12).

### Success Counting

Each die result: `Math.floor(value / 4)` = number of successes. Max value on harmonique die = **envolée** (critical). Rolling 1 = **fausse note** (fumble).

### Token System (Jetons)

Two pools:
- **Conscience** (per-actor): 7 active + 18 lost slots. Spent for atouts, dé merveilleux, rerolls, magical effects.
- **Réserve collégiale** (world-wide): 10 shared jetons managed via `PenombreReserveCollegiale` application. GM-controlled, players request via query system (`CONFIG.queries`).

Jeton statuses: `actif` → `inactif` → `perdu`. Envolée reactivates 1 inactive jeton; fausse note loses 1.

### Roll Flow (PenombreRoll)

`PenombreRoll` extends `Roll`. Static `prompt()` shows `DialogV2` with: difficulty (1-20), atouts (each adds 1d6, costs 1 jeton), dé merveilleux (replaces harmonique with 1d20, costs 1 jeton), magical effect level, roll mode.

### Actions Collégiales

Multi-player rolls: initiator pays 1 jeton from reserve. Other players see participation buttons. All successes are summed. First atout is free for participants.

### Jeu des Factions (optional, `utiliserFactions` setting)

Relations between the Éminences and world factions, stored on the `reserveCollegiale` world setting (`module/models/reserve-collegiale.mjs`), managed via `PenombreReserveCollegiale` (`module/applications/reserve-collegiale.mjs`) and its `reserve-collegiale.hbs` template:
- Each faction has up to 3 **atouts collégiaux** (level 1-3) and up to 1 **complication collégiale** (level 1-3).
- **Potentiel collégial** (`reserveCollegiale.potentiel`): points spent (1 each) to create a new faction atout in play; optionally paired with a complication to start the atout at level 2 for the same cost.
- Faction atouts appear in the roll dialog alongside personal atouts (`PenombreRoll.prompt()`); the jeton spent on a faction atout must come from the réserve collégiale, never from personal conscience (enforced in `_updateNbJetons`/`_checkCanRoll`).
- Fausse note/envolée on a roll that used a faction atout degrades that atout's level by 1 (erased at 0) — `PenombreRoll._degraderAtoutFaction()`, called from `PenombreActor.rollHarmonique()` and `PenombreRoll.reroll()`.
- The individual "spend jetons to create a complication instead" flow in the roll dialog can also target a faction (`complicationCible`), crediting/creating a collegial complication instead of a personal one.
- All faction/potentiel writes go through `PenombreReserveCollegiale._mutate*` static methods (single source of truth), called directly by the GM or via `CONFIG.queries["penombre.*"]` when a player triggers them.
- See `source/Pénombre - Système Le Jeu des Factions v3-2.docx` for the full rules text, and `factions.md` for the implementation plan.

### Combat

`PenombreCombat` extends `Combat`. Initiative: 100-200 range for adversaires, 200-300 for éminences.

## Settings

| Key | Type | Description |
|-----|------|-------------|
| `styleJeu` | String | Game style: `demo` (10 tokens locked), `standard`, `avance` |
| `nbJetons` | Number | Number of reserve tokens (demo forces 10) |
| `desSpeciaux` | Boolean | Custom Dice So Nice! appearance |
| `desSpeciauxTexture` | Boolean | Custom Dice So Nice! textures |
| `reserveCollegiale` | Object | Persisted reserve state (TypeDataModel): jetons, potentiel collégial, factions |
| `utiliserFactions` | Boolean | Enables the Jeu des Factions (collegial atouts/complications) |

## Debug Mode

`CONFIG.debug.penombre` with flags: `reserve`, `rolls`, `sheets`, `chat`.
