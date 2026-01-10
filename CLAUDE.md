# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pénombre is a Foundry Virtual Tabletop (VTT) game system for the French tabletop RPG "Pénombre" based on Mathieu Gaborit's novels. It targets Foundry VTT v13.

## Build Commands

```bash
# Compile LESS to CSS (with watch mode)
npx gulp

# Compile LESS once without watch
npx gulp css

# Extract LevelDB packs to YAML source files
npm run LDBtoYML

# Compile YAML source files back to LevelDB packs
npm run YMLtoLDB

# Run ESLint
npx eslint .

# Run Prettier
npx prettier --check .
```

## Architecture

### Entry Point
- `penombre.mjs` - Main entry point, registers all document types, sheets, and Foundry hooks

### Module Structure
- `module/models/` - Data models extending `foundry.abstract.DataModel`
  - Actor types: `eminence` (player characters), `adversaire` (NPCs/enemies)
  - Item types: `pouvoir`, `atout`, `maitrise`, `action`, `intrigue`
  - `reserve-collegiale.mjs` - Shared token pool system for collaborative play
  - `harmonique-message.mjs` - Custom chat message data for "harmonique" rolls

- `module/documents/` - Document classes extending Foundry base classes
  - `PenombreActor`, `PenombreItem`, `PenombreRoll`, `PenombreMessage`, `PenombreCombat`

- `module/applications/` - Application/sheet classes (Foundry AppV2)
  - `sheets/` - Character and item sheets
  - `reserve-collegiale.mjs` - UI for the collaborative token pool
  - `sidebar-menu.mjs` - Custom sidebar tab
  - `combat-tracker.mjs` - Modified combat tracker

- `module/elements/` - Custom HTML elements/web components
  - Uses adopted stylesheets pattern via `adopted-style-sheet-mixin.mjs`

- `module/helpers/` - Utilities for Handlebars, settings, and macros

- `module/config/` - System constants and configuration

### Styles
- LESS source files in `styles/`
- Entry point: `styles/penombre.less`
- Compiled output: `css/penombre.css`

### Compendium Packs
- Source YAML files: `src/packs/`
- Compiled LevelDB: `packs/`
- Always edit YAML sources, then compile with `npm run YMLtoLDB`

### Templates
- Handlebars templates in `templates/`
- Partials organized by document type (e.g., `templates/eminence/partials/`)

## Code Style

- ES6+ modules with `import`/`export`
- No semicolons (Prettier configured with `semi: false`)
- Max line length: 180 characters
- Double quotes for strings
- camelCase for variables/functions, PascalCase for classes
- JSDoc required for exported modules
- Vanilla JS only (no jQuery for DOM manipulation)

## Foundry VTT Specifics

- System ID: `penombre`
- Global namespace: `game.system.api` exposes applications, models, documents, helpers
- Debug flags: `CONFIG.debug.penombre` with `reserve`, `rolls`, `sheets`, `chat` options
- Socket enabled for real-time synchronization
- Hot reload enabled for CSS, HTML, HBS, and JSON files
