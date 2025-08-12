import { SYSTEM } from "../config/system.mjs"
export default class PenombreRoll extends Roll {
  static DIALOG_TEMPLATE = "modules/penombre/templates/roll-dialog.hbs"

  static async prompt(options = {}) {
    const actor = options.actor || null
    if (!actor) return null
    const harmonique = options.harmonique || null
    const harmoniqueDice = options.rollValue

    const rollModes = Object.fromEntries(Object.entries(CONFIG.Dice.rollModes).map(([key, value]) => [key, game.i18n.localize(value.label)]))
    const fieldRollMode = new foundry.data.fields.StringField({ choices: rollModes, blankdefault: "public" })

    let formule = options.formule || (harmoniqueDice ? `1${harmoniqueDice}` : "1d20")
    const bonusAtouts = 0
    const deMerveilleux = options.deMerveilleux || false
    const atouts = options.atouts || []
    const choiceDifficulte = SYSTEM.DIFFICULTE

    const maxJetonsConscience = actor.system.nbJetonsRestants
    const maxJetonsReserve = await game.settings.get("penombre", "reserveCollegiale").nbJetonsRestants

    const fieldJetonsConscience = new foundry.data.fields.NumberField({ initial: 0, min: 0, max: maxJetonsConscience, step: 1 })
    const fieldJetonsReserve = new foundry.data.fields.NumberField({ initial: 0, min: 0, max: maxJetonsReserve, step: 1 })

    let dialogContext = {
      actor,
      rollModes,
      fieldRollMode,
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
    }

    const content = await foundry.applications.handlebars.renderTemplate("systems/penombre/templates/roll-dialog.hbs", dialogContext)
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

    const rollData = {
      value: options.rollValue,
    }

    const roll = new this(formule, options.data, rollData)

    await roll.evaluate()

    return roll
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
    const harmoniqueDice = document.querySelector("#harmoniqueDice").value
    const deMerveilleux = document.querySelector("#deMerveilleux").checked
    const bonusAtouts = document.querySelector("#bonusAtouts").value
    let formule = deMerveilleux ? `1d20` : `1${harmoniqueDice}`
    if (bonusAtouts > 0) {
      formule += ` + ${bonusAtouts}d6`
    }
    document.querySelector("#formule").value = formule
  }
}
