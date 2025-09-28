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

/**
 * Register world usage statistics
 * @param {string} registerKey
 */
function registerWorldCount(registerKey) {
  if (game.user.isGM) {
    let worldKey = game.settings.get(registerKey, "worldKey")
    if (worldKey === undefined || worldKey === "") {
      worldKey = foundry.utils.randomID(32)
      game.settings.set(registerKey, "worldKey", worldKey)
    }

    // Simple API counter
    const worldData = {
      register_key: registerKey,
      world_key: worldKey,
      foundry_version: `${game.release.generation}.${game.release.build}`,
      system_name: game.system.id,
      system_version: game.system.version,
    }

    let apiURL = "https://worlds.qawstats.info/worlds-counter"
    $.ajax({
      url: apiURL,
      type: "POST",
      data: JSON.stringify(worldData),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      async: false,
    })
  }
}

Hooks.once("ready", function () {
  game.system.applicationReserveCollegiale = new applications.PenombreReserveCollegiale()
  game.system.applicationReserveCollegiale.render({ force: true })
  if (!CONFIG.debug.penombre) {
    CONFIG.debug.penombre = {
      reserve: false,
      rolls: false,
      sheets: false,
      chat: false,
    }
  }
  // Statistics
  registerWorldCount("penombre")
})

Hooks.on("updateSetting", async (setting, update, options, id) => {
  // Mise à jour de la Réserve collégiale
  if (setting.key === "penombre.reserveCollegiale") {
    game.system.applicationReserveCollegiale.render(true)
  }

  // Mise à jour du nombre de jetons dans la réserve collégiale
  if (setting.key === "penombre.nbJetons" && game.user.isGM) {
    if (CONFIG.debug.penombre?.reserve) console.debug("Pénombre | Mise à jour du nombre de jetons dans la réserve collégiale", setting, update, options, id)
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

/**
 * Adds custom dice to Dice So Nice!.
 */
Hooks.once("diceSoNiceReady", (dice3d) => {
  // Called once the module is ready to listen to new rolls and display 3D animations.
  // dice3d: Main class, instantiated and ready to use.

  dice3d.addSystem({ id: "penombre", name: "Pénombre" }, "preferred")
  dice3d.addDicePreset({
    type: "d2",
    labels: [
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 1 - pile
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 2 - face
    ],
    system: "penombre",
  })
  dice3d.addDicePreset({
    type: "d4",
    labels: [
      "systems/penombre/assets/dice-so-nice/d-fumble.webp", // 1 - fumble
      "systems/penombre/assets/dice-so-nice/d-0-succes.webp", // 2
      "systems/penombre/assets/dice-so-nice/d-0-succes.webp", // 3
      "systems/penombre/assets/dice-so-nice/d-1-envolee.webp", // 4 - 1 succes - 1 envolee
    ],
    system: "penombre",
  })
  dice3d.addDicePreset({
    type: "d6",
    labels: [
      "systems/penombre/assets/dice-so-nice/d-fumble.webp", // 1 fumble
      "systems/penombre/assets/dice-so-nice/d-0-succes.webp", // 2
      "systems/penombre/assets/dice-so-nice/d-0-succes.webp", // 3
      "systems/penombre/assets/dice-so-nice/d-1-succes.webp", // 4 - 1 succes
      "systems/penombre/assets/dice-so-nice/d-1-succes.webp", // 5 - 1 succes
      "systems/penombre/assets/dice-so-nice/d-1-envolee.webp", // 6 - 1 succes - 1 envolee
    ],
    system: "penombre",
  })
  dice3d.addDicePreset({
    type: "d8",
    labels: [
      // Les images .webp commençant par "d8-" on une plus grande marge que celle commençant par "d-"
      "systems/penombre/assets/dice-so-nice/d8-fumble.webp", // 1 fumble
      "systems/penombre/assets/dice-so-nice/d8-0-succes.webp", // 2
      "systems/penombre/assets/dice-so-nice/d8-0-succes.webp", // 3
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 4 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 5 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 6 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 7 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-2-envolee.webp", // 8 - 2 succes - 2 envolee
    ],
    system: "penombre",
  })
  dice3d.addDicePreset({
    type: "d10",
    labels: [
      "systems/penombre/assets/dice-so-nice/d8-fumble.webp", // 1 fumble
      "systems/penombre/assets/dice-so-nice/d8-0-succes.webp", // 2
      "systems/penombre/assets/dice-so-nice/d8-0-succes.webp", // 3
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 4 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 5 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 6 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 7 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 8 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 9 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-2-envolee.webp", // 10 - 2 succes - 2 envolee
    ],
    system: "penombre",
  })
  dice3d.addDicePreset({
    type: "d12",
    labels: [
      "systems/penombre/assets/dice-so-nice/d8-fumble.webp", // 1 fumble
      "systems/penombre/assets/dice-so-nice/d8-0-succes.webp", // 2
      "systems/penombre/assets/dice-so-nice/d8-0-succes.webp", // 3
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 4 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 5 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 6 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 7 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 8 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 9 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 10 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 11 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-3-envolee.webp", // 12 - 3 succes - 3 envolee
    ],
    system: "penombre",
  })
  dice3d.addDicePreset({
    type: "d20",
    labels: [
      "systems/penombre/assets/dice-so-nice/d8-fumble.webp", // 1 fumble
      "systems/penombre/assets/dice-so-nice/d8-0-succes.webp", // 2
      "systems/penombre/assets/dice-so-nice/d8-0-succes.webp", // 3
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 4 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 5 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 6 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-1-succes.webp", // 7 - 1 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 8 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 9 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 10 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-2-succes.webp", // 11 - 2 succes
      "systems/penombre/assets/dice-so-nice/d8-3-succes.webp", // 12 - 3 succes
      "systems/penombre/assets/dice-so-nice/d8-3-succes.webp", // 13 - 3 succes
      "systems/penombre/assets/dice-so-nice/d8-3-succes.webp", // 14 - 3 succes
      "systems/penombre/assets/dice-so-nice/d8-3-succes.webp", // 15 - 3 succes
      "systems/penombre/assets/dice-so-nice/d8-4-succes.webp", // 16 - 4 succes
      "systems/penombre/assets/dice-so-nice/d8-4-succes.webp", // 17 - 4 succes
      "systems/penombre/assets/dice-so-nice/d8-4-succes.webp", // 18 - 4 succes
      "systems/penombre/assets/dice-so-nice/d8-4-succes.webp", // 19 - 4 succes
      "systems/penombre/assets/dice-so-nice/d8-merveille.webp", // 20 - 5 succes - merveille
    ],
    system: "penombre",
  })
})

/**
 * Hook appelé juste avant que Dice So Nice affiche le résultat d'un jet de dés.
 *
 * @param {string} messageId L'identifiant unique du message à récupérer.
 * @returns {Message|null} L'objet message s'il est trouvé, sinon null.
 */
Hooks.on("diceSoNiceMessageProcessed", (messageId, interception) => {
  const message = game.messages.get(messageId)
  // Si c'est une action collégiale principale et que toutes les réponses ne sont pas faites, les dés ne doivent pas être affichés
  if (message.system.actionCollegiale && !message.system.actionCollegialeMessageLie && !message.system.toutesReponsesFaites) interception.willTrigger3DRoll = false
})
