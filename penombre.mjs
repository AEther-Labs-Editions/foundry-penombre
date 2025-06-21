import { SYSTEM } from "./module/config/system.mjs"
globalThis.SYSTEM = SYSTEM // Expose the SYSTEM object to the global scope

// Import modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"

Hooks.once("init", function () {
  console.info("Penombre | Initializing Penombre...")

  globalThis.penombre = game.system
  game.system.CONST = SYSTEM

  CONFIG.Actor.documentClass = documents.EminenceActor
  CONFIG.Actor.dataModels = {
    eminence: models.PenombreEminence,
  }

  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet)
  foundry.documents.collections.Actors.registerSheet("penombre", applications.EminenceSheet, { types: ["eminence"], label: "PENOMBRE.Feuille.eminence", makeDefault: true })

  console.info("Penombre | Penombre initialized successfully.")
})
