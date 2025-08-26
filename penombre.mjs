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

  Handlebars.registerHelper("displayNbSuccess", function (value) {
    const nbSuccess = Math.floor(value / 4)
    if (nbSuccess === 1) return " (1 succès)"
    else if (nbSuccess > 1) return ` (${nbSuccess} succès)`
    else return ""
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

Hooks.on("renderChatMessageHTML", (message, html, context) => {
  console.log("Pénombre | Rendu du message de chat", message, html, context)

  // Les boutons reroll n'est affiché pour le MJ ou le joueur à l'origine du message
  if ((game.user.isGM || message.isAuthor) && !message.system.relanceFaite) {
    html.querySelectorAll(".roll.die").forEach((btn) => {
      btn.classList.add("rerollable")
      btn.addEventListener("click", (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        // Ajoute la classe css dice-selected
        ev.currentTarget.classList.toggle("dice-selected")
      })
    })

    // S'il reste au moins un jeton de conscience
    const actor = game.actors.get(message.speaker.actor)
    if (actor && actor.system.nbJetonsRestants > 0) {
      html.querySelector(".reroll-conscience").classList.remove("hidden")

      html.querySelector(".reroll-conscience").addEventListener("click", async (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        const messageId = ev.target.closest(".chat-message").dataset.messageId
        if (!messageId) return
        let rerolledDices = []
        // Remonter dans la structure html pour trouver les éléments dice-selected
        ev.target
          .closest(".chat-message")
          .querySelectorAll(".dice-selected")
          .forEach((selected) => {
            rerolledDices.push(selected.dataset.indice)
          })
        // Pas de dé sélectionné
        if (rerolledDices.length === 0) return

        // On vérifie qu'il reste un jeton de la réserve de conscience
        if (actor.system.nbJetonsRestants === 0) {
          ui.notifications.warn(game.i18n.format("PENOMBRE.warnings.jetonsConscienceInsuffisants", { actuel: 0, demande: 1 }))
          return
        }

        // Dépense d'un jeton de conscience et relance
        const depense = actor.system.depenserJetons(1)
        await documents.PenombreRoll.reroll(messageId, rerolledDices)

        // Si c'est un message lié, mettre à jour le message principal
        if (message.system.actionCollegialeMessageLie && message.system.idMessageOrigine) {
          await game.users.activeGM.query("penombre.updateMessageParticipation", {
            existingMessageId: message.system.idMessageOrigine,
            actorId: actor.id,
            answer: true,
            newMessageId: messageId,
          })
        }
      })
    }

    // S'il reste au moins un jeton dans la réserve collégiale
    let reserveCollegiale = game.settings.get(SYSTEM.ID, "reserveCollegiale")
    if (reserveCollegiale.nbJetonsRestants > 0) {
      html.querySelector(".reroll-reserve").classList.remove("hidden")

      html.querySelector(".reroll-reserve").addEventListener("click", async (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        const messageId = ev.target.closest(".chat-message").dataset.messageId
        if (!messageId) return
        let rerolledDices = []
        // Remonter dans la structure html pour trouver les éléments dice-selected
        ev.target
          .closest(".chat-message")
          .querySelectorAll(".dice-selected")
          .forEach((selected) => {
            rerolledDices.push(selected.dataset.indice)
          })
        // Pas de dé sélectionné
        if (rerolledDices.length === 0) return

        // On vérifie qu'il reste un jeton dans la réserve collégiale
        reserveCollegiale = game.settings.get(SYSTEM.ID, "reserveCollegiale")
        if (reserveCollegiale.nbJetonsRestants === 0) {
          ui.notifications.warn(game.i18n.format("PENOMBRE.warnings.jetonsReserveInsuffisants", { actuel: 0, demande: 1 }), {
            permanent: true,
          })
          return
        }

        // Dépense d'un jeton de la réserve et relance
        await game.users.activeGM.query("penombre.updateReserveCollegialeFromRoll", { nbJetons: 1 })
        await documents.PenombreRoll.reroll(messageId, rerolledDices)

        // Si c'est un message lié, mettre à jour le message principal
        if (message.system.actionCollegialeMessageLie && message.system.idMessageOrigine) {
          await game.users.activeGM.query("penombre.updateMessageParticipation", {
            existingMessageId: message.system.idMessageOrigine,
            actorId: actor.id,
            answer: true,
            newMessageId: messageId,
          })
        }
      })
    }
  }

  // Les boutons pour participer à un jet collégial sont visibles par tous les autres joueurs
  if (message.system.actionCollegiale && !message.system.actionCollegialeMessageLie && !message.isAuthor) {
    html.querySelector(".participate-yes").classList.remove("hidden")
    html.querySelector(".participate-no").classList.remove("hidden")

    const currentActorId = game.user.character?.id

    html.querySelector(".participate-yes").addEventListener("click", async (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const messageId = ev.target.closest(".chat-message").dataset.messageId
      const message = game.messages.get(messageId)
      const harmonique = message.system.harmonique
      const actor = game.actors.get(currentActorId)
      const chatMessage = await actor.rollHarmonique({ harmonique, messageType: "lie", idMessageOrigine: messageId })
      if (chatMessage) {
        await game.users.activeGM.query("penombre.updateMessageParticipation", {
          existingMessageId: messageId,
          actorId: currentActorId,
          answer: true,
          newMessageId: chatMessage.id,
        })
      }
    })

    html.querySelector(".participate-no").addEventListener("click", async (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const messageId = ev.target.closest(".chat-message").dataset.messageId
      await game.users.activeGM.query("penombre.updateMessageParticipation", { existingMessageId: messageId, actorId: currentActorId, answer: false })
    })
  }
})
