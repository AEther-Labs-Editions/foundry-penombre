import { SYSTEM } from "./module/config/system.mjs"
globalThis.SYSTEM = SYSTEM // Expose the SYSTEM object to the global scope

export * as elements from "./module/elements/_module.mjs"

// Import modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"

Hooks.once("init", function () {
  console.info("Pénombre | Initialisation du système...")

  globalThis.penombre = game.system
  game.system.CONST = SYSTEM

  CONFIG.Actor.documentClass = documents.PenombreActor
  CONFIG.Actor.dataModels = {
    eminence: models.PenombreEminence,
  }
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet)
  foundry.documents.collections.Actors.registerSheet(SYSTEM.ID, applications.EminenceSheet, { types: ["eminence"], label: "PENOMBRE.Feuille.eminence", makeDefault: true })

  CONFIG.Item.documentClass = documents.PenombreItem
  CONFIG.Item.dataModels = {
    pouvoir: models.PenombrePouvoir,
  }
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet)
  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.PouvoirSheet, { types: ["pouvoir"], label: "PENOMBRE.Feuille.pouvoir", makeDefault: true })

  Handlebars.registerHelper("getDiceImage", function (value) {
    return `/systems/penombre/assets/ui/${value}-marge.png`
  })

  console.info("Pénombre | Système initialisé.")
})
