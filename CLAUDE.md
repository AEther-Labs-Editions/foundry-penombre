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

### Combat

`PenombreCombat` extends `Combat`. Initiative: 100-200 range for adversaires, 200-300 for éminences.

## Settings

| Key | Type | Description |
|-----|------|-------------|
| `styleJeu` | String | Game style: `demo` (10 tokens locked), `standard`, `avance` |
| `nbJetons` | Number | Number of reserve tokens (demo forces 10) |
| `desSpeciaux` | Boolean | Custom Dice So Nice! appearance |
| `desSpeciauxTexture` | Boolean | Custom Dice So Nice! textures |
| `reserveCollegiale` | Object | Persisted reserve state (TypeDataModel) |

## Debug Mode

`CONFIG.debug.penombre` with flags: `reserve`, `rolls`, `sheets`, `chat`.
