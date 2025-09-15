import { SYSTEM } from "../config/system.mjs"

/**
 * Constantes pour le calcul des succès et types de dés
 */
const SUCCESS_DIVISOR = 4
const MERVEILLEUX_FACES = 20

export default class PenombreRoll extends Roll {
  static DIALOG_TEMPLATE = "modules/penombre/templates/dialogs/roll-dialog.hbs"

  static CHAT_TEMPLATE = "systems/penombre/templates/chat/harmonique-roll.hbs"

  static TOOLTIP_TEMPLATE = "systems/penombre/templates/chat/dice-tooltip.hbs"

  static async prompt(options = {}) {
    const messageType = options.messageType || "principal"
    let messagesLies = {}
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

    // Niveau de l'effet magique : de 1 à 5
    const choiceEffetMagiqueNiveau = Object.freeze(Array.from({ length: 5 }, (_, i) => i + 1).reduce((acc, level) => ({ ...acc, [level]: String(level) }), {}))

    // Maîtrises utilisables pour l'effet magique
    const maitrises = actor.itemTypes.maitrise || []
    const choiceEffetMagiqueMaitrise = Object.fromEntries(maitrises.map((m) => [m.system.slug, m.name]))

    let dialogContext = {
      actor,
      messageType,
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
      choiceEffetMagiqueNiveau,
      choiceEffetMagiqueMaitrise,
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
          label: game.i18n.localize("PENOMBRE.ui.lancerDes"),
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
            console.log("Pénombre | PenombreRoll output", output)
            return output
          },
        },
      ],
      render: (event, dialog) => {
        // Contrôle le nombre de jetons et active/désactive le bouton de lancement du jet
        PenombreRoll._updateNbJetons()

        // Harmonique
        const harmoniqueSelect = dialog.element.querySelector("#harmonique")
        if (harmoniqueSelect) {
          harmoniqueSelect.addEventListener("change", this._onChangeHarmonique.bind(this))
        }
        // Action collégiale
        const actionCollegiale = dialog.element.querySelector("#actionCollegiale")
        if (actionCollegiale) {
          actionCollegiale.addEventListener("change", this._onToggleActionCollegiale.bind(this))
        }
        // Case Premier atout pour action collégiale : permet d'avoir le premier atout sans coût en jeton
        const actionCollegialePremierAtout = dialog.element.querySelector("#actionCollegialePremierAtout")
        if (actionCollegialePremierAtout) {
          actionCollegialePremierAtout.addEventListener("change", this._onToggleActionCollegialePremierAtout.bind(this))
        }
        // Effet magique
        const effetMagique = dialog.element.querySelector("#effetMagique")
        if (effetMagique) {
          effetMagique.addEventListener("change", this._onToggleEffetMagique.bind(this))
        }
        // Niveau de l'effet magique
        const effetMagiqueNiveau = dialog.element.querySelector("#effetMagiqueNiveau")
        if (effetMagiqueNiveau) {
          effetMagiqueNiveau.addEventListener("change", this._onChangeEffetMagiqueNiveau.bind(this))
        }
        // Maîtrise utilisée
        const effetMagiqueMaitrise = dialog.element.querySelector("#effetMagiqueMaitrise")
        if (effetMagiqueMaitrise) {
          effetMagiqueMaitrise.addEventListener("change", this._onChangeEffetMagiqueMaitrise.bind(this))
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
        // Bonus de formule
        const autreBonus = dialog.element.querySelector("#autreBonus")
        if (autreBonus) {
          autreBonus.addEventListener("change", this._onChangeAutreBonus.bind(this))
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
      messageType,
      actorId: actor.id,
      harmonique: rollContext.harmonique,
      actionCollegiale: messageType === "principal" ? rollContext.actionCollegiale : true,
      difficulte: rollContext.difficulte,
      rollMode: rollContext.rollMode,
      formule: rollContext.formule,
    }

    /**
     * @param {string} formula    The string formula to parse
     * @param {object} data       The data object against which to parse attributes within the formula
     * @param {RollOptions} [options]  Options modifying or describing the Roll
     */
    const roll = new this(formule, options.data, rollOptions)
    // Le premier dé est toujours le dé d'harmonique
    roll.dice[0].options.appearance = { system: "penombre" }
    // Les autres dés sont des dés d'atouts (d6) ou un dé merveilleux (d20)
    for (let i = 1; i < roll.dice.length; i++) {
      if (roll.dice[i].faces === MERVEILLEUX_FACES) {
        roll.dice[i].options.appearance = { system: "penombre" }
      } else {
        roll.dice[i].options.appearance = { system: "standard" }
      }
    }

    await roll.evaluate()

    console.log("Pénombre | PenombreRoll roll", roll)

    return roll
  }

  // #region Événements du prompt
  /**
   * Gère l'événement de changement pour la sélection de l'harmonique.
   * Met à jour la formule et définit le texte du label harmonique avec la valeur localisée correspondant à l'option sélectionnée.
   *
   * @param {Event} event L'événement de changement déclenché par la sélection de l'harmonique.
   */
  static _onChangeHarmonique(event) {
    PenombreRoll._updateFormula()
    document.querySelector("#harmonique-label").textContent = game.i18n.localize(`PENOMBRE.ui.${event.target.options[event.target.selectedIndex].value}`)
  }

  /**
   * Gère le basculement de la case "Action collégiale".
   * Affiche ou masque le label "premierAtout" selon l'état de la case.
   * Si décochée, décoche également la case "actionCollegialePremierAtout".
   * Met à jour le nombre de jetons en appelant PenombreRoll._updateNbJetons().
   *
   * @param {Event} event L'événement déclenché par le changement de la case à cocher.
   */
  static _onToggleActionCollegiale(event) {
    const premierAtoutLabel = document.querySelector("label.premierAtout")
    if (event.target.checked) {
      if (premierAtoutLabel) premierAtoutLabel.style.visibility = "visible"
    } else {
      if (premierAtoutLabel) premierAtoutLabel.style.visibility = "hidden"
      const premierAtoutCheckbox = document.querySelector("#actionCollegialePremierAtout")
      if (premierAtoutCheckbox) premierAtoutCheckbox.checked = false
    }
    PenombreRoll._updateNbJetons()
  }

  /**
   * Gère le basculement de la case "Premier atout pour action collégiale".
   * Met à jour le nombre de jetons à dépenser en appelant PenombreRoll._updateNbJetons().
   *
   * @param {Event} event L'événement déclenché par le changement de la case à cocher.
   * @private
   */
  static _onToggleActionCollegialePremierAtout(event) {
    PenombreRoll._updateNbJetons()
  }

  static _onToggleEffetMagique(event) {
    const effetMagiqueNiveauDiv = document.querySelector(".form-group.effet-magique-niveau")
    const effetMagiqueMaitriseDiv = document.querySelector(".form-group.effet-magique-maitrise")

    if (event.target.checked) {
      // Afficher les divs quand la checkbox est cochée
      if (effetMagiqueNiveauDiv) effetMagiqueNiveauDiv.style.display = "flex"
      if (effetMagiqueMaitriseDiv) effetMagiqueMaitriseDiv.style.display = "flex"
    } else {
      // Masquer les divs quand la checkbox est décochée
      if (effetMagiqueNiveauDiv) effetMagiqueNiveauDiv.style.display = "none"
      if (effetMagiqueMaitriseDiv) effetMagiqueMaitriseDiv.style.display = "none"
    }
    PenombreRoll._updateNbJetons()
  }

  static _onChangeEffetMagiqueNiveau(event) {
    PenombreRoll._updateNbJetons()
  }

  static _onChangeEffetMagiqueMaitrise(event) {
    PenombreRoll._updateNbJetons()
  }

  static _checkCanRoll(jetons) {
    // Vérification des conditions de lancement
    let canRoll = true
    const jetonsConscience = Number(document.querySelector("#jetonsConscience").value) || 0
    const jetonsReserve = Number(document.querySelector("#jetonsReserve").value) || 0
    const jetonsTotal = jetonsConscience + jetonsReserve

    if (jetonsTotal !== jetons) canRoll = false

    if (canRoll) document.querySelector('button[type="submit"]').disabled = false
    else document.querySelector('button[type="submit"]').disabled = true
  }

  static _onToggleAtout(event) {
    let item = event.currentTarget.closest(".atout")
    item.classList.toggle("checked")
    // Calcul du bonus total des atouts
    let bonusTotal = Array.from(document.querySelectorAll(".atout.checked")).reduce((total, atout) => total + Number(atout.dataset.bonus), 0)
    document.querySelector("#bonusAtouts").value = bonusTotal

    // Calcul du nombre de jetons à dépenser
    PenombreRoll._updateNbJetons()
    PenombreRoll._updateFormula()
  }

  static _onToggleDeMerveilleux(event) {
    PenombreRoll._updateNbJetons()
    PenombreRoll._updateFormula()
  }

  static _onChangeAutreBonus(event) {
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
      ui.notifications.warn(game.i18n.format("PENOMBRE.warnings.jetonsReserveInsuffisants", { actuel: nbJetonsRestantsReserveCollegiale, demande: jetonsReserve }), {
        permanent: true,
      })
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
    const autreBonus = document.querySelector("#autreBonus").value

    let formule = deMerveilleux ? `1d20` : `1${harmoniqueDice}`
    if (bonusAtouts > 0) {
      formule += ` + ${bonusAtouts}d6`
    }
    if (autreBonus && PenombreRoll._isValidDiceFormula(autreBonus)) {
      formule += ` + ${autreBonus}`
    }
    document.querySelector("#formule").value = formule
  }

  /**
   * Valide qu'une chaîne de caractères correspond à une formule de dé valide.
   * Accepte uniquement les formats : 1d20 ou xd6 (où x est un nombre positif)
   *
   * @param {string} formula La formule à valider
   * @returns {boolean} True si la formule est valide, false sinon
   */
  static _isValidDiceFormula(formula) {
    if (!formula || typeof formula !== "string") return false

    const trimmedFormula = formula.trim()

    // Expression régulière pour valider uniquement 1d20 ou xd6 (x > 0)
    // ^1d20$ : exactement 1d20
    // ^\d+d6$ : un ou plusieurs chiffres suivis de d6
    const dicePattern = /^(1d20|\d+d6)$/i

    if (!dicePattern.test(trimmedFormula)) return false

    // Vérification supplémentaire pour s'assurer que x dans xd6 est positif
    const d6Match = trimmedFormula.match(/^(\d+)d6$/i)
    if (d6Match) {
      const numberOfDice = parseInt(d6Match[1], 10)
      return numberOfDice > 0
    }

    // Si c'est 1d20, c'est valide
    return true
  }

  static _updateNbJetons() {
    // Action collégiale
    const actionCollegiale = document.querySelector("#actionCollegiale")?.checked ?? false
    const jetonActionCollegiale = actionCollegiale ? 1 : 0

    const actionCollegialeLiee = document.querySelector("#actionCollegiale")?.checked === undefined // Si on ne trouve pas la checkbox, c'est que c'est une action collégiale liée

    // Le joueur a-t-il coché la case "Premier atout pour action collégiale" ?
    const actionCollegialePremierAtout = document.querySelector("#actionCollegialePremierAtout")?.checked ?? false

    // Atouts : 1 jeton par atout au-delà du premier sinon 1 jeton par atout
    // Dans le cas d'une action collégiale, le premier atout ne coûte pas de jeton si la case est cochée
    // Pour une action collégiale liée, si la case est cochée, le premier atout ne coûte pas de jeton
    const nbAtoutsSelectionnes = Number(document.querySelectorAll(".atout.checked").length)
    let premierAtoutGratuit = false
    if (
      (actionCollegiale && actionCollegialePremierAtout) ||
      (!actionCollegiale && !actionCollegialeLiee) ||
      (!actionCollegiale && actionCollegialeLiee && actionCollegialePremierAtout)
    ) {
      premierAtoutGratuit = true
    }
    let jetonsAtouts = nbAtoutsSelectionnes
    if (premierAtoutGratuit) jetonsAtouts = Math.max(nbAtoutsSelectionnes - 1, 0)

    // Dé merveilleux
    const deMerveilleux = document.querySelector("#deMerveilleux").checked
    const jetonDeMerveilleux = deMerveilleux ? 1 : 0

    // Effet magique
    const effetMagique = document.querySelector("#effetMagique")?.checked ?? false
    const jetonEffetMagique = effetMagique ? 1 : 0

    // Selon la maitrise magique : 1 jeton par niveau manquant par rapport au niveau de l'effet magique souhaité
    const niveauEffetMagique = Number(document.querySelector("#effetMagiqueNiveau")?.value || 1)
    const maitriseSlug = document.querySelector("#effetMagiqueMaitrise")?.value || null
    const actorId = document.querySelector(".penombre-roll-dialog").dataset.actorId
    let actor = null
    if (actorId) actor = game.actors.get(actorId)
    let niveauMaitrise = 0
    if (actor && maitriseSlug) {
      const maitrise = actor.itemTypes.maitrise.find((m) => m.system.slug === maitriseSlug)
      if (maitrise) niveauMaitrise = maitrise.system.niveau || 0
    }
    const jetonsEffetMagiqueMaitrise = effetMagique ? Math.max(niveauEffetMagique - niveauMaitrise, 0) : 0

    // Total des jetons à dépenser
    const jetons = jetonsAtouts + jetonActionCollegiale + jetonDeMerveilleux + jetonEffetMagique + jetonsEffetMagiqueMaitrise
    document.querySelector("#jetons").value = jetons

    // Met à jour le tooltip pour expliquer chaque partie du total
    const tooltipLabel = document.querySelector("#jetonsDepenserTooltip")
    if (tooltipLabel) {
      const tooltipContent = `
        • Atouts : ${jetonsAtouts} ${nbAtoutsSelectionnes > 0 && premierAtoutGratuit ? "(Premier atout gratuit)" : ""}<br>
        • Action collégiale : ${jetonActionCollegiale} <br>
        • Dé merveilleux : ${jetonDeMerveilleux} <br>
        • Produire effet magique : ${jetonEffetMagique} <br>
        • Compenser maîtrise magique : ${jetonsEffetMagiqueMaitrise} <br>
        Total : ${jetons}`

      tooltipLabel.setAttribute("data-tooltip", tooltipContent)
    }

    PenombreRoll._checkCanRoll(jetons)
    return jetons
  }
  // #endregion Événements du prompt

  /** @override */
  async _prepareChatRenderContext({ flavor, isPrivate = false, ...options } = {}) {
    const rollResults = PenombreRoll.analyseRollResult(this)
    const nbSucces = rollResults.nbSucces
    const isFausseNote = rollResults.isDeHarmoniqueMin
    const isEnvolee = rollResults.isDeHarmoniqueMax
    let typeEnvolee = 1
    if (rollResults.typeDeHarmonique === 8 || rollResults.typeDeHarmonique === 10) typeEnvolee = 2
    else if (rollResults.typeDeHarmonique === 12) typeEnvolee = 3
    const isIncidentMagique = rollResults.isDeMerveilleuxMin
    const isMerveille = rollResults.isDeMerveilleuxMax
    const hasDifficulte = this.options.difficulte !== ""
    let succesManquants = 0
    if (hasDifficulte) {
      succesManquants = Math.max(this.options.difficulte - nbSucces, 0)
    }
    const actorIdSource = this.options.actorId
    const actorId = game.user.character?.id
    const isSuccess = hasDifficulte && nbSucces >= this.options.difficulte

    return {
      messageType: this.options.messageType,
      harmonique: this.options.harmonique,
      actionCollegiale: this.options.actionCollegiale,
      isActionPrincipale: this.options.messageType === "principal",
      hasDifficulte: this.options.difficulte !== "",
      difficulte: this.options.difficulte,
      nbSucces,
      succesManquants,
      isSuccess,
      isFausseNote,
      isEnvolee,
      typeEnvolee,
      isIncidentMagique,
      isMerveille,
      isPrivate,
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : (flavor ?? this.options.flavor),
      user: game.user.id,
      peutParticiper: actorIdSource !== actorId,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
    }
  }

  /**
   * Analyzes the result of a dice roll and returns statistics about successes and special die outcomes.
   * La formule est de type : dé harmonique / dé merveilleux + dé d'atouts + éventuellement dé merveilleux
   *
   * @param {Object} roll The roll object containing dice information.
   * @param {Array<Object>} roll.dice Array of dice objects.
   * @param {number} roll.dice[].faces Number of faces on the die.
   * @param {number} roll.dice[].total The total rolled value for the die.
   * @param {Array<Object>} roll.dice[].results Array of individual roll results for the die.
   * @param {number} roll.dice[].results[].result The value of each individual roll result.
   * @returns {Object} An object containing:
   *   @property {number} nbSucces - The total number of successes.
   *   @property {boolean} isDeHarmoniqueMin - True if the first die (harmonique) rolled its minimum value.
   *   @property {boolean} isDeHarmoniqueMax - True if the first die (harmonique) rolled its maximum value.
   *   @property {boolean} isDeMerveilleuxMin - True if the first die (merveilleux) rolled its minimum value.
   *   @property {boolean} isDeMerveilleuxMax - True if the first die (merveilleux) rolled its maximum value.
   */
  static analyseRollResult(roll) {
    let nbSucces = 0
    let isDeHarmoniqueMin = false
    let isDeHarmoniqueMax = false
    let isDeMerveilleuxMin = false
    let isDeMerveilleuxMax = false
    let typeDeHarmonique = null

    for (const [index, die] of roll.dice.entries()) {
      // Traitement du premier dé uniquement (dé harmonique ou merveilleux)
      if (index === 0) {
        typeDeHarmonique = die.faces
        const isMerveilleux = die.faces === MERVEILLEUX_FACES

        // Résultat maximum
        if (die.total === die.faces) {
          if (isMerveilleux) {
            isDeMerveilleuxMax = true
          } else {
            isDeHarmoniqueMax = true
          }
        }

        // Résultat minimum
        if (die.total === 1) {
          if (isMerveilleux) {
            isDeMerveilleuxMin = true
          } else {
            isDeHarmoniqueMin = true
          }
        }
      }

      // Les autres dés peuvent être un dé merveilleux ou des dés d'atouts
      else if (die.faces === MERVEILLEUX_FACES) {
        if (die.total === die.faces) isDeMerveilleuxMax = true
        if (die.total === 1) isDeMerveilleuxMin = true
      }

      // Calcul des succès pour tous les dés
      for (const result of die.results) {
        nbSucces += Math.floor(result.result / SUCCESS_DIVISOR)
      }
    }

    console.log("Pénombre | analyseRollResult", { nbSucces, isDeHarmoniqueMin, isDeHarmoniqueMax, isDeMerveilleuxMin, isDeMerveilleuxMax })
    return { nbSucces, typeDeHarmonique, isDeHarmoniqueMin, isDeHarmoniqueMax, isDeMerveilleuxMin, isDeMerveilleuxMax }
  }

  /**
   * Relance les résultats de dés spécifiés dans un message de jet Pénombre et met à jour le message.
   *
   * @param {string} messageId L'identifiant du message de chat contenant le jet à relancer.
   * @param {string[]} rerolledDices Tableau des indices de dés à relancer, format "dieIndex-resultIndex".
   * @returns {Promise<void>} Résout lorsque la relance et la mise à jour du message sont terminées.
   */
  static async reroll(messageId, rerolledDices) {
    const message = game.messages.get(messageId)
    if (!message) {
      return
    }

    // Vérifie que le message est un jet de dés de Pénombre
    if (message.isRoll && message.rolls[0] && message.rolls[0] instanceof PenombreRoll) {
      const roll = message.rolls[0]

      // Reprise du choix du rollMode
      const rollMode = roll.options.rollMode
      let whisper = null
      // Self roll
      if (rollMode === SYSTEM.DICE_ROLL_MODES.SELF) whisper = [game.user.id]
      // Private or blind roll
      else if (rollMode === SYSTEM.DICE_ROLL_MODES.PRIVATE || rollMode === SYSTEM.DICE_ROLL_MODES.BLIND) whisper = game.users.filter((u) => u.isGM).map((u) => u.id)

      const blind = rollMode === SYSTEM.DICE_ROLL_MODES.BLIND

      if (roll) console.log("Pénombre | Rerolling dice", roll, rerolledDices)

      const newRolls = []

      for (const indice of rerolledDices) {
        const [dieIndex, resultIndex] = indice.split("-").map(Number)
        if (roll.dice[dieIndex] && roll.dice[dieIndex].results[resultIndex]) {
          const formula = `1d${roll.dice[dieIndex].faces}`
          const newDice = await new Roll(formula, {}, { rollMode }).evaluate()
          newRolls.push(newDice)
          roll.dice[dieIndex].results[resultIndex].result = parseInt(newDice.result)
        }
      }

      // Affichage groupé de tous les nouveaux dés avec Dice So Nice
      if (game.modules.get("dice-so-nice")?.active && newRolls.length > 0) {
        const synchronize = !game.user.isGM
        const showPromises = newRolls.map((newDice) => game.dice3d.showForRoll(newDice, game.user, synchronize, whisper, blind))
        await Promise.all(showPromises)
      }

      await message.update({ rolls: [roll], "system.relanceFaite": true })
    }
  }
}
