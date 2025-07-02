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

  Handlebars.registerHelper("getJetonImage", function (value) {
    if (value === "actif") {
      return `systems/penombre/assets/ui/jeton_face_active.png`
    }
    if (value === "inactif") {
      return `systems/penombre/assets/ui/jeton_face_inactive.png`
    }
  })

  Handlebars.registerHelper("getCaseConscienceImage", function (myVal, myCase) {
    switch  (myCase) {
      case 1 : {
        if (myVal > 0) {
          return `systems/penombre/assets/ui/transp_case_checked.png`
        } else {
          return `systems/penombre/assets/ui/transp_case_unchecked.png`
        }
      break
      }
      case 2 : {
        if (myVal > 1) {
          return `systems/penombre/assets/ui/transp_case_checked.png`
        } else {
          return `systems/penombre/assets/ui/transp_case_unchecked.png`
        }
        break
      }
      case 3 : {
        if (myVal > 2) {
          return `systems/penombre/assets/ui/transp_case_checked.png`
        } else {
          return `systems/penombre/assets/ui/transp_case_unchecked.png`
        }
        break
      }
      default:
    }

  })

  Handlebars.registerHelper("times", function (n, block) {
    let accum = ""
    for (let i = 1; i <= n; ++i) {
      block.data.index = i
      block.data.first = i === 0
      block.data.last = i === n - 1
      accum += block.fn(this)
    }
    return accum
  })

  game.settings.register(SYSTEM.ID, "styleJeu", {
    name: "PENOMBRE.Settings.styleJeu.name",
    hint: "PENOMBRE.Settings.styleJeu.hint",
    scope: "world",
    config: true,
    default: "demo",
    type: String,
    choices: {
      demo: "PENOMBRE.Settings.styleJeu.demo",
      standard: "PENOMBRE.Settings.styleJeu.standard",
      avance: "PENOMBRE.Settings.styleJeu.avance",
    },
    requiresReload: true,
  })

  console.info("Pénombre | Système initialisé.")
})
