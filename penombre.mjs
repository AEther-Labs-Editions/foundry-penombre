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
    atout: models.PenombreAtout,
    maitrise: models.PenombreMaitrise,
  }
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet)
  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.PouvoirSheet, { types: ["pouvoir"], label: "PENOMBRE.Feuille.pouvoir", makeDefault: true })
  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.AtoutSheet, { types: ["atout"], label: "PENOMBRE.Feuille.atout", makeDefault: true })
  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.MaitriseSheet, { types: ["maitrise"], label: "PENOMBRE.Feuille.maitrise", makeDefault: true })

  CONFIG.queries["penombre.updateReserveCollegiale"] = applications.PenombreReserveCollegiale._handleQueryUpdateReserveCollegiale
  CONFIG.queries["penombre.updateReserveCollegialeFromRoll"] = applications.PenombreReserveCollegiale._handleQueryUpdateReserveCollegialeFromRoll

  CONFIG.Dice.rolls.push(documents.PenombreRoll)

  Handlebars.registerHelper("getDiceImage", function (value) {
    return `/systems/penombre/assets/ui/${value}-marge.png`
  })

  Handlebars.registerHelper("getJetonImage", function (value) {
    switch (value) {
      case true:
      case "actif":
        return `systems/penombre/assets/ui/jeton_face_active.png`
      case false:
      case "inactif":
        return `systems/penombre/assets/ui/jeton_face_inactive.png`
      case "perdu":
        return `systems/penombre/assets/ui/cercle.png`
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

  game.settings.register(SYSTEM.ID, "nbJetons", {
    name: "PENOMBRE.Settings.nbJetons.name",
    hint: "PENOMBRE.Settings.nbJetons.hint",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    requiresReload: true,
  })

  game.settings.register(SYSTEM.ID, "reserveCollegiale", {
    name: "PENOMBRE.Settings.reserveCollegiale.name",
    hint: "PENOMBRE.Settings.reserveCollegiale.hint",
    scope: "world",
    config: false,
    type: models.ReserveCollegiale,
    default: {
      jetons: {
        1: { valeur: false },
        2: { valeur: false },
        3: { valeur: false },
        4: { valeur: false },
        5: { valeur: false },
        6: { valeur: false },
        7: { valeur: false },
        8: { valeur: false },
        9: { valeur: false },
        10: { valeur: false },
      },
    },
  })

  console.info("Pénombre | Système initialisé.")
})

Hooks.once("ready", function () {
  game.system.applicationReserveCollegiale = new applications.PenombreReserveCollegiale()
  game.system.applicationReserveCollegiale.render({ force: true })
})

Hooks.on("updateSetting", async (setting, update, options, id) => {
  // Mise à jour de la Réserve collégiale
  if (setting.key === "penombre.reserveCollegiale") {
    game.system.applicationReserveCollegiale.render(true)
  }

  // Mise à jour du nombre de jetons dans la réserve collégiale
  if (setting.key === "penombre.nbJetons" && game.user.isGM) {
    console.log("Pénombre | Mise à jour du nombre de jetons dans la réserve collégiale", setting, update, options, id)
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    const nouveauNbJetons = update.value

    // Ajouter les jetons manquants si le nombre augmente
    for (let i = 1; i <= nouveauNbJetons; i++) {
      const key = String(i)
      if (!reserveCollegiale.jetons.hasOwnProperty(key)) {
        reserveCollegiale.jetons[key] = { valeur: false }
      }
    }

    // Supprimer les jetons en excès si le nombre diminue
    Object.keys(reserveCollegiale.jetons).forEach((key) => {
      const numericKey = parseInt(key, 10)
      if (numericKey > nouveauNbJetons) {
        delete reserveCollegiale.jetons[key]
      }
    })

    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }
})
