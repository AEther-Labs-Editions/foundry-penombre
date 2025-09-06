import { SYSTEM } from "./module/config/system.mjs"
globalThis.SYSTEM = SYSTEM // Expose the SYSTEM object to the global scope

export * as elements from "./module/elements/_module.mjs"

// Import modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"
import * as helpers from "./module/helpers/_module.mjs"

Hooks.once("init", function () {
  console.info("Pénombre | Initialisation du système...")

  globalThis.penombre = game.system
  game.system.CONST = SYSTEM

  game.system.api = {
    applications,
    models,
    documents,
    helpers,
  }

  CONFIG.Actor.documentClass = documents.PenombreActor
  CONFIG.Actor.dataModels = {
    eminence: models.PenombreEminence,
    adversaire: models.PenombreAdversaire,
  }
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet)
  foundry.documents.collections.Actors.registerSheet(SYSTEM.ID, applications.EminenceSheet, { types: ["eminence"], label: "PENOMBRE.Feuille.eminence", makeDefault: true })
  foundry.documents.collections.Actors.registerSheet(SYSTEM.ID, applications.AdversaireSheet, { types: ["adversaire"], label: "PENOMBRE.Feuille.adversaire", makeDefault: true })

  CONFIG.Item.documentClass = documents.PenombreItem
  CONFIG.Item.dataModels = {
    pouvoir: models.PenombrePouvoir,
    atout: models.PenombreAtout,
    maitrise: models.PenombreMaitrise,
    action: models.PenombreAction,
    intrigue: models.PenombreIntrigue,
  }
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet)
  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.PouvoirSheet, { types: ["pouvoir"], label: "PENOMBRE.Feuille.pouvoir", makeDefault: true })
  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.AtoutSheet, { types: ["atout"], label: "PENOMBRE.Feuille.atout", makeDefault: true })
  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.MaitriseSheet, { types: ["maitrise"], label: "PENOMBRE.Feuille.maitrise", makeDefault: true })

  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.ActionSheet, { types: ["action"], label: "PENOMBRE.Feuille.action", makeDefault: true })
  foundry.documents.collections.Items.registerSheet(SYSTEM.ID, applications.IntrigueSheet, { types: ["intrigue"], label: "PENOMBRE.Feuille.intrigue", makeDefault: true })

  CONFIG.queries["penombre.updateReserveCollegiale"] = applications.PenombreReserveCollegiale._handleQueryUpdateReserveCollegiale
  CONFIG.queries["penombre.updateReserveCollegialeFromRoll"] = applications.PenombreReserveCollegiale._handleQueryUpdateReserveCollegialeFromRoll
  CONFIG.queries["penombre.updateMessageParticipation"] = documents.PenombreMessage._handleQueryMessageParticipation

  CONFIG.Dice.rolls.push(documents.PenombreRoll)

  CONFIG.ChatMessage.documentClass = documents.PenombreMessage
  CONFIG.ChatMessage.dataModels = {
    base: models.BaseMessageData,
    harmonique: models.HarmoniqueMessageData,
  }

  // Ajout d'un nouvel onglet dans la barre latérale
  CONFIG.ui.sidebar.TABS.penombre = {
    active: false,
    icon: `penombre`,
    tooltip: `Pénombre`,
  }
  CONFIG.ui.penombre = applications.PenombreSidebarMenu

  helpers.PenombreSettingsHandler.registerSettings()
  helpers.registerHandlebars()

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

    let nouveauNbJetons = update.value

    // En mode Kit de demo, on force le nombre de jetons à 10
    if (game.settings.get("penombre", "styleJeu") === "demo" && nouveauNbJetons !== 10) {
      nouveauNbJetons = 10
      await game.settings.set(SYSTEM.ID, "nbJetons", 10)
    }

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

Hooks.on("renderChatMessageHTML", applications.hooks.renderChatMessageHTML)
