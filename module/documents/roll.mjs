import { SYSTEM } from "../config/system.mjs"
export default class PenombreRoll extends Roll {
  static DIALOG_TEMPLATE = "modules/penombre/templates/roll-dialog.hbs"

  static async prompt(options = {}) {
    let formula = options.rollValue
    const harmonique = options.harmonique || null

    const rollModes = Object.fromEntries(Object.entries(CONFIG.Dice.rollModes).map(([key, value]) => [key, game.i18n.localize(value.label)]))
    const fieldRollMode = new foundry.data.fields.StringField({
      choices: rollModes,
      blank: false,
      default: "public",
    })

    const atouts = options.atouts || []

    const choiceDifficulte = SYSTEM.DIFFICULTE

    let dialogContext = {
      rollModes,
      fieldRollMode,
      formula,
      atouts,
      label: game.i18n.localize(`PENOMBRE.ui.${harmonique}`),
      choiceDifficulte,
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
          callback: (event, button, dialog) => {
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
            console.log("RollDialogV2: output", output)
            return output
          },
        },
      ],
      render: (event, dialog) => {
        const inputs = dialog.element.querySelectorAll(".atout")
        if (inputs) {
          inputs.forEach((input) => {
            input.addEventListener("click", this._onToggleAtout.bind(this))
          })
        }
      },
    })

    // If the user cancels the dialog, exit early (intentional silent return)
    if (rollContext === null) return

    const rollData = {
      value: options.rollValue,
    }

    const roll = new this(formula, options.data, rollData)

    await roll.evaluate()

    return roll
  }

  static _onToggleAtout(event) {
    let item = event.currentTarget.closest(".atout")
    item.classList.toggle("checked")
  }
}
