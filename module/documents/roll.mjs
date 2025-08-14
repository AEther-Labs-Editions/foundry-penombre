import { SYSTEM } from "../config/system.mjs"
export default class PenombreRoll extends Roll {
  static DIALOG_TEMPLATE = "modules/penombre/templates/dialogs/roll-dialog.hbs"

  static CHAT_TEMPLATE = "systems/penombre/templates/chat/harmonique-roll.hbs"

  static TOOLTIP_TEMPLATE = "systems/penombre/templates/chat/dice-tooltip.hbs"

  static async prompt(options = {}) {
    const actor = options.actor || null
    if (!actor) return null
    const harmonique = options.harmonique || null
    const harmoniqueDice = options.rollValue

    const rollModes = Object.fromEntries(Object.entries(CONFIG.Dice.rollModes).map(([key, value]) => [key, game.i18n.localize(value.label)]))
    const defaultRollMode = game.settings.get("core", "rollMode")
    const fieldRollMode = new foundry.data.fields.StringField({ choices: rollModes, blank: false, default: defaultRollMode })

    let formule = options.formule || (harmoniqueDice ? `1${harmoniqueDice}` : "1d20")
    const bonusAtouts = 0
    const deMerveilleux = options.deMerveilleux || false
    const atouts = options.atouts || []
    const choiceDifficulte = SYSTEM.DIFFICULTE

    const maxJetonsConscience = actor.system.nbJetonsRestants
    const maxJetonsReserve = await game.settings.get("penombre", "reserveCollegiale").nbJetonsRestants

    const fieldJetonsConscience = new foundry.data.fields.NumberField({ initial: 0, min: 0, max: maxJetonsConscience, step: 1 })
    const fieldJetonsReserve = new foundry.data.fields.NumberField({ initial: 0, min: 0, max: maxJetonsReserve, step: 1 })

    const fieldHarmonique = new foundry.data.fields.StringField({
      required: true,
      nullable: false,
      choices: Object.fromEntries(Object.entries(SYSTEM.HARMONIQUE_VALEURS).map(([key, value]) => [value, { label: `${value}` }])),
    })

    // Construit le choix de l'harmonique
    const choiceHarmonique = Object.entries(actor.system.harmoniques).reduce((acc, [key, obj]) => {
      acc[key] = `${game.i18n.localize(`PENOMBRE.ui.${key}`)} (${obj.valeur})`
      return acc
    }, {})

    let dialogContext = {
      actor,
      rollModes,
      defaultRollMode,
      fieldRollMode,
      harmonique,
      harmoniqueDice,
      formule,
      bonusAtouts,
      deMerveilleux,
      atouts,
      label: game.i18n.localize(`PENOMBRE.ui.${harmonique}`),
      choiceDifficulte,
      canRoll: true,
      maxJetonsConscience,
      fieldJetonsConscience,
      maxJetonsReserve,
      fieldJetonsReserve,
      fieldHarmonique,
      choiceHarmonique,
    }

    const content = await foundry.applications.handlebars.renderTemplate("systems/penombre/templates/dialogs/roll-dialog.hbs", dialogContext)
    const title = harmonique != null ? `Jet de ${game.i18n.localize(`PENOMBRE.ui.${harmonique}`)}` : "Jet de dés"

    const rollContext = await foundry.applications.api.DialogV2.wait({
      window: { title },
      classes: ["penombre", "roll-dialog"],
      position: { width: 600 },
      content,
      rejectClose: false, // Click on Close button will not launch an error
      buttons: [
        {
          label: "Lancer les dés",
          callback: async (event, button, dialog) => {
            const output = Array.from(button.form.elements).reduce((obj, input) => {
              if (input.name) {
                if (input.type === "checkbox") {
                  obj[input.name] = input.checked
                } else if (input.type === "radio") {
                  // Only store the value if this radio button is checked
                  if (input.checked) {
                    obj[input.name] = input.value
                  }
                } else {
                  obj[input.name] = input.value
                }
              }
              return obj
            }, {})
            console.log("PenombreRoll output", output)
            return output
          },
        },
      ],
      render: (event, dialog) => {
        // Harmonique
        const harmoniqueSelect = dialog.element.querySelector("#harmonique")
        if (harmoniqueSelect) {
          harmoniqueSelect.addEventListener("change", this._onChangeHarmonique.bind(this))
        }

        // Atouts
        const inputs = dialog.element.querySelectorAll(".atout")
        if (inputs) {
          inputs.forEach((input) => {
            input.addEventListener("click", this._onToggleAtout.bind(this))
          })
        }
        // Dé merveilleux
        const cbDeMerveilleux = dialog.element.querySelector("#deMerveilleux")
        if (cbDeMerveilleux) {
          cbDeMerveilleux.addEventListener("change", this._onToggleDeMerveilleux.bind(this))
        }
        // Jetons
        const jetonsConscience = dialog.element.querySelector("#jetonsConscience")
        if (jetonsConscience) {
          jetonsConscience.addEventListener("change", this._onChangeJetons.bind(this))
        }
        const jetonsReserve = dialog.element.querySelector("#jetonsReserve")
        if (jetonsReserve) {
          jetonsReserve.addEventListener("change", this._onChangeJetons.bind(this))
        }
      },
    })

    // If the user cancels the dialog, exit early (intentional silent return)
    if (rollContext === null) return

    // Dépense de jetons de la réserve collégiale
    const jetonsReserveDepenses = jetonsReserve.value !== "" ? Number(jetonsReserve.value) : 0
    if (jetonsReserveDepenses !== 0) {
      await game.users.activeGM.query("penombre.updateReserveCollegialeFromRoll", { nbJetons: jetonsReserveDepenses })
    }

    // Dépense de jetons de la conscience
    const jetonsConscienceDepenses = jetonsConscience.value !== "" ? Number(jetonsConscience.value) : 0
    if (jetonsConscienceDepenses !== 0) {
      const depense = await actor.system.depenserJetons(jetonsConscienceDepenses)
    }

    formule = rollContext.formule || formule

    const rollOptions = {
      harmonique: rollContext.harmonique,
      actionCollegiale: rollContext.actionCollegiale,
      difficulte: rollContext.difficulte,
      rollMode: rollContext.rollMode,
      formule: rollContext.formule,
    }

    const roll = new this(formule, options.data, rollOptions)

    await roll.evaluate()

    console.log("PenombreRoll roll", roll)

    return roll
  }

  // #region Événements du prompt
  static _onChangeHarmonique(event) {
    PenombreRoll._updateFormula()
    document.querySelector("#harmonique-label").textContent = game.i18n.localize(`PENOMBRE.ui.${event.target.options[event.target.selectedIndex].value}`)
  }

  static _onToggleAtout(event) {
    let item = event.currentTarget.closest(".atout")
    item.classList.toggle("checked")
    // Calcul du bonus total des atouts
    let bonusTotal = Array.from(document.querySelectorAll(".atout.checked")).reduce((total, atout) => total + Number(atout.dataset.bonus), 0)
    document.querySelector("#bonusAtouts").value = bonusTotal

    // Calcul du nombre de jetons à dépenser
    const jetons = Math.max(document.querySelectorAll(".atout.checked").length - 1, 0)
    document.querySelector("#jetons").value = jetons
    PenombreRoll._updateFormula()

    // Vérification des conditions de lancement
    let canRoll = true
    const jetonsConscience = Number(document.querySelector("#jetonsConscience").value) || 0
    const jetonsReserve = Number(document.querySelector("#jetonsReserve").value) || 0
    const jetonsTotal = jetonsConscience + jetonsReserve

    if (jetonsTotal !== jetons) canRoll = false

    if (canRoll) document.querySelector('button[type="submit"]').disabled = false
    else document.querySelector('button[type="submit"]').disabled = true
  }

  static _onToggleDeMerveilleux(event) {
    PenombreRoll._updateFormula()
  }

  static _onChangeJetons(event) {
    let canRoll = true
    const jetonsConscience = Number(document.querySelector("#jetonsConscience").value) || 0
    const jetonsReserve = Number(document.querySelector("#jetonsReserve").value) || 0
    const jetonsTotal = jetonsConscience + jetonsReserve

    const jetons = Number(document.querySelector("#jetons").value)

    if (jetonsTotal > jetons) {
      ui.notifications.warn(game.i18n.localize("PENOMBRE.warnings.jetonsDepassement"))
    }

    // Vérification du nombre de jetons disponibles
    const id = document.querySelector(".penombre-roll-dialog").dataset.actorId
    let actor
    if (id) actor = game.actors.get(id)
    if (!actor) return

    // Jetons de conscience
    const nbJetonsRestantsConscience = actor.system.nbJetonsRestants
    if (jetonsConscience > nbJetonsRestantsConscience) {
      ui.notifications.warn(game.i18n.format("PENOMBRE.warnings.jetonsConscienceInsuffisants", { actuel: nbJetonsRestantsConscience, demande: jetonsConscience }))
      canRoll = false
    }

    // Jetons de la réserve collégiale
    const reserveCollegiale = game.settings.get("penombre", "reserveCollegiale")
    const nbJetonsRestantsReserveCollegiale = reserveCollegiale.nbJetonsRestants
    if (jetonsReserve > nbJetonsRestantsReserveCollegiale) {
      ui.notifications.warn(game.i18n.format("PENOMBRE.warnings.jetonsReserveInsuffisants", { actuel: nbJetonsRestantsReserveCollegiale, demande: jetonsReserve }))
      canRoll = false
    }

    // Permet le lancer ou non
    if (jetonsTotal !== jetons) canRoll = false

    if (canRoll) document.querySelector('button[type="submit"]').disabled = false
    else document.querySelector('button[type="submit"]').disabled = true
  }

  static _updateFormula() {
    const harmonique = document.querySelector("#harmonique").value
    const id = document.querySelector(".penombre-roll-dialog").dataset.actorId
    let actor
    if (id) actor = game.actors.get(id)
    if (!actor) return
    const harmoniqueDice = actor.system.harmoniques[harmonique].valeur
    const deMerveilleux = document.querySelector("#deMerveilleux").checked
    const bonusAtouts = document.querySelector("#bonusAtouts").value
    let formule = deMerveilleux ? `1d20` : `1${harmoniqueDice}`
    if (bonusAtouts > 0) {
      formule += ` + ${bonusAtouts}d6`
    }
    document.querySelector("#formule").value = formule
  }
  // #endregion Événements du prompt

  /** @override */
  async _prepareChatRenderContext({ flavor, isPrivate = false, ...options } = {}) {
    const nbSucces = PenombreRoll.analyseRollResult(this)
    const hasDifficulte = this.options.difficulte !== ""
    const isSuccess = hasDifficulte && nbSucces >= this.options.difficulte
    return {
      harmonique: this.options.harmonique,
      hasDifficulte: this.options.difficulte !== "",
      difficulte: this.options.difficulte,
      nbSucces,
      isSuccess,
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : (flavor ?? this.options.flavor),
      user: game.user.id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
    }
  }

  /**
   * Analyse le résultat d'un jet et calcule le nombre de succès.
   * Chaque résultat de dé est divisé par 4 et arrondi à l'entier inférieur pour déterminer le nombre de succès par résultat.
   *
   * @param {Object} roll L'objet Roll contenant les résultats des dés.
   * @returns {number} Le nombre total de succès calculé à partir du jet : 1 succès par tranche de 4 au dé
   */
  static analyseRollResult(roll) {
    let nbSucces = 0
    // Parcourt le tableau et calcule les succès
    for (const die of roll.dice) {
      for (const r of die.results) {
        nbSucces += Math.floor(r.result / 4)
      }
    }
    return nbSucces
  }

  static async reroll(messageId, rerolledDices) {
    const message = game.messages.get(messageId)
    if (!message) {
      return
    }

    // Vérifie que le message est un jet de dés de Pénombre
    if (message.isRoll && message.rolls[0] && message.rolls[0] instanceof PenombreRoll) {
      const roll = message.rolls[0]
      if (roll) console.log("Pénombre | Rerolling dice", roll, rerolledDices)
      for (const indice of rerolledDices) {
        const [dieIndex, resultIndex] = indice.split("-").map(Number)
        if (roll.dice[dieIndex] && roll.dice[dieIndex].results[resultIndex]) {
          const formula = `1d${roll.dice[dieIndex].faces}`
          const newDice = await new Roll(formula).evaluate()
          roll.dice[dieIndex].results[resultIndex].result = newDice.result
        }
      }
      await message.update({ rolls: [roll], "system.relanceFaite": true })
    }
  }
}
