import { SYSTEM } from "../config/system.mjs"
import { demanderAuMJ, mjConnecte } from "../helpers/mj.mjs"
import { MERVEILLEUX_FACES, analyserDes, calculerCoutJetons, jetonsARepartir as calculerJetonsARepartir, verifierRepartition } from "../regles/jets.mjs"

const DICE_APPEARANCE_CONFIGS = {
  "penombre-beige": {
    foreground: "#7d3339",
    background: "#b3944f",
    textureCustom: "penombre_texture_beige_et_dore",
    edge: "#b3944f",
  },
  "penombre-bleu": {
    foreground: "#ffffff",
    background: "#84b3e3",
    textureCustom: "penombre_texture_bleu_argente",
    edge: "#84b3e3",
  },
}

export default class PenombreRoll extends Roll {
  static DIALOG_TEMPLATE = "systems/penombre/templates/dialogs/roll-dialog.hbs"

  static CHAT_TEMPLATE = "systems/penombre/templates/chat/harmonique-roll.hbs"

  static TOOLTIP_TEMPLATE = "systems/penombre/templates/chat/dice-tooltip.hbs"

  /**
   * @param {"penombre-beige"|"penombre-bleu"} colorset
   * @param {boolean} hasTexture
   * @returns {object}
   */
  static _getDiceAppearance(colorset, hasTexture) {
    const c = DICE_APPEARANCE_CONFIGS[colorset]
    const appearance = {
      colorset,
      foreground: c.foreground,
      edge: c.edge,
      material: "glass",
      font: "Cattedrale",
      system: "penombre",
    }
    if (hasTexture) {
      appearance.texture = c.textureCustom
    } else {
      appearance.background = c.background
      appearance.texture = "water"
    }
    return appearance
  }

  /**
   * Destinataires de l'animation Dice So Nice selon le mode du jet, comme pour le message de tchat.
   * @param {string} rollMode Mode du jet (SYSTEM.DICE_ROLL_MODES)
   * @returns {{whisper: string[]|null, blind: boolean}} whisper : utilisateurs qui voient l'animation (null pour tous)
   */
  static _visibiliteDSN(rollMode) {
    // Les jets enregistrés avant Foundry V14 portent les anciens noms des modes
    rollMode = { publicroll: "public", gmroll: "gm", blindroll: "blind", selfroll: "self" }[rollMode] ?? rollMode
    let whisper = null
    // Jet pour soi
    if (rollMode === SYSTEM.DICE_ROLL_MODES.SELF) whisper = [game.user.id]
    // Jet privé ou à l'aveugle : MJ seulement
    else if (rollMode === SYSTEM.DICE_ROLL_MODES.PRIVATE || rollMode === SYSTEM.DICE_ROLL_MODES.BLIND) whisper = game.users.filter((u) => u.isGM).map((u) => u.id)
    const blind = rollMode === SYSTEM.DICE_ROLL_MODES.BLIND
    return { whisper, blind }
  }

  /**
   * @param {Roll} roll
   */
  static _applyDiceAppearances(roll) {
    if (!game.modules.get("dice-so-nice")?.active) return
    const desSpeciaux = game.settings.get(SYSTEM.ID, "desSpeciaux")
    const desSpeciauxTexture = game.settings.get(SYSTEM.ID, "desSpeciauxTexture")
    if (!(game.dice3d.getLoadedDiceSystems().has("penombre") && desSpeciaux)) {
      for (const die of roll.dice) {
        die.options.appearance = { system: "standard" }
      }
      return
    }
    for (let i = 0; i < roll.dice.length; i++) {
      const die = roll.dice[i]
      const colorset = (i === 0 || die.faces === MERVEILLEUX_FACES) ? "penombre-beige" : "penombre-bleu"
      die.options.appearance = PenombreRoll._getDiceAppearance(colorset, desSpeciauxTexture)
    }
  }

  static async prompt(options = {}) {
    const messageType = options.messageType || "principal"
    let messagesLies = {}
    const actor = options.actor || null
    if (!actor) return null
    const harmonique = options.harmonique || null
    const harmoniqueDice = options.rollValue

    const rollModes = CONFIG.ChatMessage.modes
    const defaultRollMode = game.settings.get("core", "messageMode") ?? CONST.DICE_ROLL_MODES.PUBLIC
    const fieldRollMode = new foundry.data.fields.StringField({ choices: rollModes, blank: false, default: defaultRollMode })

    let formule = options.formule || (harmoniqueDice ? `1${harmoniqueDice}` : "1d20")
    const bonusAtouts = 0
    const deMerveilleux = options.deMerveilleux || false
    const atouts = options.atouts || []
    const choiceDifficulte = SYSTEM.DIFFICULTE

    // Sans MJ connecté, la réserve collégiale et les factions ne sont pas utilisables (écritures faites par le MJ)
    const avecMJ = mjConnecte()
    if (!avecMJ) ui.notifications.warn("PENOMBRE.Warnings.mjAbsentJet", { localize: true })

    const maxJetonsConscience = actor.system.nbJetonsRestants
    const maxJetonsReserve = avecMJ ? game.settings.get(SYSTEM.ID, "reserveCollegiale").nbJetonsRestants : 0

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

    // Factions : atouts utilisables dans le jet et liste pour choisir la cible d'une complication créée en jeu
    const utiliserFactions = game.settings.get(SYSTEM.ID, "styleJeu") !== "demo" && game.settings.get(SYSTEM.ID, "utiliserFactions")
    let factionAtouts = []
    let factions = []
    if (utiliserFactions && avecMJ) {
      const reserveCollegiale = game.settings.get(SYSTEM.ID, "reserveCollegiale")
      factionAtouts = reserveCollegiale.allFactionAtouts || []
      factions = Object.entries(reserveCollegiale.factions || {}).map(([id, faction]) => ({ id, nom: faction.nom }))
    }

    // Une complication individuelle ne peut être créée que s'il reste au moins une des 4 cases libres (description
    // vide) ; une complication de faction reste toujours possible dès lors qu'au moins une faction existe.
    const hasComplicationLibreIndividuelle = Object.values(actor.system.conscience?.complications ?? {}).some((complication) => !complication.description)
    const hasComplicationLibre = hasComplicationLibreIndividuelle || factions.length > 0

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
      factionAtouts,
      factions,
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
      hasComplicationLibre,
      hasComplicationLibreIndividuelle,
    }

    const content = await foundry.applications.handlebars.renderTemplate("systems/penombre/templates/dialogs/roll-dialog.hbs", dialogContext)
    const title = harmonique != null ? `Jet de ${game.i18n.localize(`PENOMBRE.ui.${harmonique}`)}` : "Jet de dés"

    const rollContext = await foundry.applications.api.DialogV2.wait({
      window: { title },
      classes: ["penombre", "roll-dialog"],
      position: { width: 625 },
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
            // Console.log("Pénombre | PenombreRoll output", output)
            return output
          },
        },
      ],
      render: (event, dialog) => {
        // Contrôle le nombre de jetons et active/désactive le bouton de lancement du jet
        PenombreRoll._updateNbJetons(dialog.element)

        // Harmonique
        const harmoniqueSelect = dialog.element.querySelector("#harmonique")
        if (harmoniqueSelect) {
          harmoniqueSelect.addEventListener("change", (evt) => this._onChangeHarmonique(evt, dialog.element))
        }
        // Action collégiale
        const actionCollegiale = dialog.element.querySelector("#actionCollegiale")
        if (actionCollegiale) {
          actionCollegiale.addEventListener("change", (evt) => this._onToggleActionCollegiale(evt, dialog.element))
        }
        // Case Premier atout pour action collégiale : permet d'avoir le premier atout sans coût en jeton
        const actionCollegialePremierAtout = dialog.element.querySelector("#actionCollegialePremierAtout")
        if (actionCollegialePremierAtout) {
          actionCollegialePremierAtout.addEventListener("change", (evt) => this._onToggleActionCollegialePremierAtout(evt, dialog.element))
        }
        // Effet magique
        const effetMagique = dialog.element.querySelector("#effetMagique")
        if (effetMagique) {
          effetMagique.addEventListener("change", (evt) => this._onToggleEffetMagique(evt, dialog.element))
        }
        // Niveau de l'effet magique
        const effetMagiqueNiveau = dialog.element.querySelector("#effetMagiqueNiveau")
        if (effetMagiqueNiveau) {
          effetMagiqueNiveau.addEventListener("change", (evt) => this._onChangeEffetMagiqueNiveau(evt, dialog.element))
        }
        // Maîtrise utilisée
        const effetMagiqueMaitrise = dialog.element.querySelector("#effetMagiqueMaitrise")
        if (effetMagiqueMaitrise) {
          effetMagiqueMaitrise.addEventListener("change", (evt) => this._onChangeEffetMagiqueMaitrise(evt, dialog.element))
        }
        // Atouts
        const inputs = dialog.element.querySelectorAll(".atout")
        if (inputs) {
          inputs.forEach((input) => {
            input.addEventListener("click", (evt) => this._onToggleAtout(evt, dialog.element))
          })
        }
        // Dé merveilleux
        const cbDeMerveilleux = dialog.element.querySelector("#deMerveilleux")
        if (cbDeMerveilleux) {
          cbDeMerveilleux.addEventListener("change", (evt) => this._onToggleDeMerveilleux(evt, dialog.element))
        }
        // Bonus de formule
        const autreBonus = dialog.element.querySelector("#autreBonus")
        if (autreBonus) {
          autreBonus.addEventListener("change", (evt) => this._onChangeAutreBonus(evt, dialog.element))
        }
        // Jetons
        const jetonsConscience = dialog.element.querySelector("#jetonsConscience")
        if (jetonsConscience) {
          jetonsConscience.addEventListener("change", (evt) => this._validerJetons(dialog.element, { notifier: true }))
        }
        const jetonsReserve = dialog.element.querySelector("#jetonsReserve")
        if (jetonsReserve) {
          jetonsReserve.addEventListener("change", (evt) => this._validerJetons(dialog.element, { notifier: true }))
        }
        // Complication : dispense d'une partie du coût en jetons du jet
        const complicationUse = dialog.element.querySelector("#complicationUse")
        if (complicationUse) {
          complicationUse.addEventListener("change", (evt) => this._onToggleComplication(evt, dialog.element))
        }
        const complicationJetons = dialog.element.querySelector("#complicationJetons")
        if (complicationJetons) {
          complicationJetons.addEventListener("change", (evt) => this._onChangeComplicationJetons(evt, dialog.element))
        }
        const complicationDescription = dialog.element.querySelector("#complicationDescription")
        if (complicationDescription) {
          complicationDescription.addEventListener("input", () => {
            this._validerJetons(dialog.element)
          })
        }
      },
    })

    // If the user cancels the dialog, exit early (intentional silent return)
    if (rollContext === null) return

    // Calcul des jetons à dépenser (la dépense effective se fait après l'évaluation du jet)
    const jetonsReserveDepenses = rollContext.jetonsReserve !== "" ? Number(rollContext.jetonsReserve) : 0
    const jetonsConscienceDepenses = rollContext.jetonsConscience !== "" ? Number(rollContext.jetonsConscience) : 0

    // Complication créée à la place d'une partie du coût en jetons, pour l'acteur ou pour une faction
    const complicationUse = rollContext.complicationUse === true
    const complicationJetons = complicationUse ? Number(rollContext.complicationJetons || 0) : 0
    const complicationDescription = complicationUse ? (rollContext.complicationDescription || "").trim() : ""
    const complicationCible = complicationUse ? rollContext.complicationCible || "moi" : "moi"

    // Atouts de faction utilisés pour ce jet (pour la dégradation de niveau en cas de fausse note)
    let factionAtoutsUsed = []
    try {
      factionAtoutsUsed = JSON.parse(rollContext.factionAtoutsUsed || "[]")
    } catch {
      factionAtoutsUsed = []
    }

    // Le MJ a pu se déconnecter pendant que la fenêtre était ouverte
    const besoinMJ = jetonsReserveDepenses > 0 || factionAtoutsUsed.length > 0 || (complicationUse && complicationJetons > 0 && complicationCible !== "moi")
    if (besoinMJ && !mjConnecte()) {
      ui.notifications.warn("PENOMBRE.Warnings.mjAbsentJet", { localize: true })
      return null
    }

    formule = rollContext.formule || formule

    const rollOptions = {
      messageType,
      actorId: actor.id,
      harmonique: rollContext.harmonique,
      actionCollegiale: messageType === "principal" ? rollContext.actionCollegiale : true,
      difficulte: rollContext.difficulte,
      rollMode: rollContext.messageMode,
      formule: rollContext.formule,
      factionAtoutsUsed,
    }

    /**
     * @param {string} formula    The string formula to parse
     * @param {object} data       The data object against which to parse attributes within the formula
     * @param {RollOptions} [options]  Options modifying or describing the Roll
     */
    const roll = new this(formule, options.data, rollOptions)

    PenombreRoll._applyDiceAppearances(roll)
    await roll.evaluate()

    // Dépense de jetons après évaluation réussie du jet (évite de perdre des jetons si le roll échoue).
    // Le jet n'est publié que si tout est payé : la conscience est vérifiée avant de prendre dans la réserve,
    // dont le paiement est fait en une fois par le MJ (une autre joueuse a pu dépenser entre-temps).
    const nbJetonsRestantsConscience = actor.system.nbJetonsRestants
    if (jetonsConscienceDepenses > nbJetonsRestantsConscience) {
      ui.notifications.warn(game.i18n.format("PENOMBRE.Warnings.jetonsConscienceInsuffisants", { actuel: nbJetonsRestantsConscience, demande: jetonsConscienceDepenses }))
      return null
    }
    if (jetonsReserveDepenses !== 0) {
      const paiement = await demanderAuMJ("penombre.updateReserveCollegialeFromRoll", { nbJetons: jetonsReserveDepenses })
      if (!paiement.ok) return null
      if (!paiement.resultat?.paye) {
        ui.notifications.warn(game.i18n.format("PENOMBRE.Warnings.jetAnnuleReserve", { actuel: paiement.resultat?.restants ?? 0, demande: jetonsReserveDepenses }), {
          permanent: true,
        })
        return null
      }
    }
    if (jetonsConscienceDepenses !== 0) {
      await actor.system.depenserJetons(jetonsConscienceDepenses)
    }
    if (complicationUse && complicationJetons > 0 && complicationCible === "moi") {
      const complications = actor.system.conscience.complications
      const slotKey = Object.keys(complications).find((key) => !complications[key].description)
      if (slotKey) {
        await actor.update({
          [`system.conscience.complications.${slotKey}.description`]: complicationDescription,
          [`system.conscience.complications.${slotKey}.valeur`]: complicationJetons,
        })
      }
    } else if (complicationUse && complicationJetons > 0) {
      await demanderAuMJ("penombre.addFactionComplicationFromRoll", {
        factionId: complicationCible,
        niveau: complicationJetons,
        nom: complicationDescription,
      })
    }

    if (CONFIG.debug.penombre?.rolls) console.debug("Pénombre | PenombreRoll | roll", roll)

    return roll
  }

  // #region Événements du prompt
  /**
   * Gère l'événement de changement pour la sélection de l'harmonique.
   * Met à jour la formule et définit le texte du label harmonique avec la valeur localisée correspondant à l'option sélectionnée.
   *
   * @param {Event} event L'événement de changement déclenché par la sélection de l'harmonique.
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   */
  static _onChangeHarmonique(event, dialogElement) {
    PenombreRoll._updateFormula(dialogElement)
    const harmoniqueLabel = dialogElement.querySelector("#harmonique-label")
    if (harmoniqueLabel) {
      harmoniqueLabel.textContent = game.i18n.localize(`PENOMBRE.ui.${event.target.options[event.target.selectedIndex].value}`)
    }
  }

  /**
   * Gère le basculement de la case "Action collégiale".
   * Affiche ou masque le label "premierAtout" selon l'état de la case.
   * Si décochée, décoche également la case "actionCollegialePremierAtout".
   * Met à jour le nombre de jetons en appelant PenombreRoll._updateNbJetons().
   *
   * @param {Event} event L'événement déclenché par le changement de la case à cocher.
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   */
  static _onToggleActionCollegiale(event, dialogElement) {
    const premierAtoutLabel = dialogElement.querySelector("label.premierAtout")
    if (event.target.checked) {
      if (premierAtoutLabel) premierAtoutLabel.style.visibility = "visible"
    } else {
      if (premierAtoutLabel) premierAtoutLabel.style.visibility = "hidden"
      const premierAtoutCheckbox = dialogElement.querySelector("#actionCollegialePremierAtout")
      if (premierAtoutCheckbox) premierAtoutCheckbox.checked = false
    }
    PenombreRoll._updateNbJetons(dialogElement)
  }

  /**
   * Gère le basculement de la case "Premier atout pour action collégiale".
   * Met à jour le nombre de jetons à dépenser en appelant PenombreRoll._updateNbJetons().
   *
   * @param {Event} event L'événement déclenché par le changement de la case à cocher.
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   * @private
   */
  static _onToggleActionCollegialePremierAtout(event, dialogElement) {
    PenombreRoll._updateNbJetons(dialogElement)
  }

  static _onToggleEffetMagique(event, dialogElement) {
    const effetMagiqueNiveauDiv = dialogElement.querySelector(".form-group.effet-magique-niveau")
    const effetMagiqueMaitriseDiv = dialogElement.querySelector(".form-group.effet-magique-maitrise")

    if (event.target.checked) {
      // Afficher les divs quand la checkbox est cochée
      if (effetMagiqueNiveauDiv) effetMagiqueNiveauDiv.style.display = "flex"
      if (effetMagiqueMaitriseDiv) effetMagiqueMaitriseDiv.style.display = "flex"
    } else {
      // Masquer les divs quand la checkbox est décochée
      if (effetMagiqueNiveauDiv) effetMagiqueNiveauDiv.style.display = "none"
      if (effetMagiqueMaitriseDiv) effetMagiqueMaitriseDiv.style.display = "none"
    }
    PenombreRoll._updateNbJetons(dialogElement)
  }

  static _onChangeEffetMagiqueNiveau(event, dialogElement) {
    PenombreRoll._updateNbJetons(dialogElement)
  }

  static _onChangeEffetMagiqueMaitrise(event, dialogElement) {
    PenombreRoll._updateNbJetons(dialogElement)
  }

  /**
   * Nombre de jetons dispensés pour ce jet grâce à une complication (0 si la case n'est pas cochée).
   *
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   * @returns {number}
   */
  static _getComplicationJetons(dialogElement) {
    const complicationUse = dialogElement.querySelector("#complicationUse")?.checked ?? false
    if (!complicationUse) return 0
    return Number(dialogElement.querySelector("#complicationJetons")?.value || 0)
  }

  /**
   * Coût total en jetons du jet, avant déduction de la complication.
   * Le champ #jetons affiché au joueur montre lui le solde restant à répartir (voir _updateNbJetons).
   *
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   * @returns {number}
   */
  static _getJetonsTotal(dialogElement) {
    return Number(dialogElement.querySelector("#jetons")?.dataset.total) || 0
  }

  /**
   * Indique si une complication est cochée mais sans description renseignée (cas bloquant le lancer).
   *
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   * @returns {boolean}
   */
  static _isComplicationDescriptionMissing(dialogElement) {
    const complicationUse = dialogElement.querySelector("#complicationUse")?.checked ?? false
    if (!complicationUse) return false
    const description = dialogElement.querySelector("#complicationDescription")?.value?.trim()
    return !description
  }

  /**
   * Nombre minimum de jetons devant obligatoirement provenir de la réserve collégiale,
   * du fait des atouts de faction cochés (le jeton d'un atout collégial ne peut venir de la conscience).
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   * @returns {number}
   */
  static _getJetonsReserveMinimum(dialogElement) {
    return Number(dialogElement.querySelector("#jetonsReserve")?.dataset.minimum) || 0
  }

  /**
   * Gère le basculement de la case "Créer une complication".
   * Affiche ou masque les champs description/jetons économisés et réinitialise leur valeur si décochée.
   *
   * @param {Event} event L'événement déclenché par le changement de la case à cocher.
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   */
  static _onToggleComplication(event, dialogElement) {
    const details = dialogElement.querySelector(".complication-details")
    if (event.target.checked) {
      if (details) details.style.display = "flex"
    } else {
      if (details) details.style.display = "none"
      const complicationDescription = dialogElement.querySelector("#complicationDescription")
      if (complicationDescription) complicationDescription.value = ""
      const complicationJetons = dialogElement.querySelector("#complicationJetons")
      if (complicationJetons) complicationJetons.value = "1"
      // Les jetons dispensés par la complication redeviennent à répartir : on remet les champs à 0
      const jetonsConscience = dialogElement.querySelector("#jetonsConscience")
      if (jetonsConscience) jetonsConscience.value = 0
      const jetonsReserve = dialogElement.querySelector("#jetonsReserve")
      if (jetonsReserve) jetonsReserve.value = 0
    }
    PenombreRoll._updateNbJetons(dialogElement)
  }

  /**
   * Gère le changement du nombre de jetons économisés par la complication.
   * Les valeurs au-delà du coût total du jet sont déjà désactivées dans le select (voir _updateNbJetons).
   *
   * @param {Event} event L'événement déclenché par le changement du select.
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   */
  static _onChangeComplicationJetons(event, dialogElement) {
    // Recalcule le solde de jetons à répartir affiché (déduit de la complication), puis revalide
    PenombreRoll._updateNbJetons(dialogElement)
    PenombreRoll._validerJetons(dialogElement, { notifier: true })
  }

  static _onToggleAtout(event, dialogElement) {
    let item = event.currentTarget.closest(".atout")
    item.classList.toggle("checked")
    // Calcul du bonus total des atouts
    let bonusTotal = Array.from(dialogElement.querySelectorAll(".atout.checked")).reduce((total, atout) => total + Number(atout.dataset.bonus), 0)
    dialogElement.querySelector("#bonusAtouts").value = bonusTotal

    PenombreRoll._updateFactionAtoutsUsed(dialogElement)
    // Calcul du nombre de jetons à dépenser
    PenombreRoll._updateNbJetons(dialogElement)
    PenombreRoll._updateFormula(dialogElement)
  }

  /**
   * Sérialise les atouts de faction actuellement cochés dans le champ caché #factionAtoutsUsed,
   * afin de pouvoir les retrouver après le jet (dégradation d'un atout collégial sur fausse note).
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   */
  static _updateFactionAtoutsUsed(dialogElement) {
    const input = dialogElement.querySelector("#factionAtoutsUsed")
    if (!input) return
    const used = Array.from(dialogElement.querySelectorAll(".faction-atout.checked")).map((el) => ({
      factionId: el.dataset.factionId,
      elementId: el.dataset.elementId,
    }))
    input.value = JSON.stringify(used)
  }

  static _onToggleDeMerveilleux(event, dialogElement) {
    PenombreRoll._updateNbJetons(dialogElement)
    PenombreRoll._updateFormula(dialogElement)
  }

  static _onChangeAutreBonus(event, dialogElement) {
    PenombreRoll._updateFormula(dialogElement)
  }

  /**
   * Seule fonction qui autorise ou non le lancer : active le bouton « Lancer les dés » si toutes les conditions
   * sont remplies (jetons répartis, disponibles en conscience et dans la réserve, minimum de jetons de la réserve
   * pour les atouts de faction, description de la complication).
   *
   * @param {HTMLElement} dialogElement L'élément DOM de la fenêtre de dialogue
   * @param {object} [options]
   * @param {boolean} [options.notifier] Affiche les avertissements, quand on vient de changer un nombre de jetons
   * @returns {boolean} Vrai si le lancer est possible
   */
  static _validerJetons(dialogElement, { notifier = false } = {}) {
    const jetonsConscience = Number(dialogElement.querySelector("#jetonsConscience").value) || 0
    const jetonsReserve = Number(dialogElement.querySelector("#jetonsReserve").value) || 0
    const aRepartir = calculerJetonsARepartir(PenombreRoll._getJetonsTotal(dialogElement), PenombreRoll._getComplicationJetons(dialogElement))
    const id = dialogElement.querySelector(".penombre-roll-dialog").dataset.actorId
    const actor = id ? game.actors.get(id) : null
    const dispoConscience = actor ? actor.system.nbJetonsRestants : null
    // La réserve collégiale est inutilisable sans MJ connecté
    const dispoReserve = mjConnecte() ? game.settings.get(SYSTEM.ID, "reserveCollegiale").nbJetonsRestants : 0
    const minimumReserve = PenombreRoll._getJetonsReserveMinimum(dialogElement)

    const { possible, erreurs } = verifierRepartition({
      jetonsConscience,
      jetonsReserve,
      aRepartir,
      dispoConscience,
      dispoReserve,
      minimumReserve,
      descriptionManquante: PenombreRoll._isComplicationDescriptionMissing(dialogElement),
    })

    if (notifier) {
      if (erreurs.includes("depassement")) ui.notifications.warn(game.i18n.localize("PENOMBRE.Warnings.jetonsDepassement"))
      if (erreurs.includes("conscience")) {
        ui.notifications.warn(game.i18n.format("PENOMBRE.Warnings.jetonsConscienceInsuffisants", { actuel: dispoConscience, demande: jetonsConscience }))
      }
      if (erreurs.includes("reserve")) {
        ui.notifications.warn(game.i18n.format("PENOMBRE.Warnings.jetonsReserveInsuffisants", { actuel: dispoReserve, demande: jetonsReserve }), { permanent: true })
      }
      if (erreurs.includes("minimumReserve")) ui.notifications.warn(game.i18n.format("PENOMBRE.Warnings.jetonsReserveFactionRequis", { minimum: minimumReserve }))
    }

    dialogElement.querySelector('button[type="submit"]').disabled = !possible
    return possible
  }

  static _updateFormula(dialogElement) {
    const harmonique = dialogElement.querySelector("#harmonique").value
    const id = dialogElement.querySelector(".penombre-roll-dialog").dataset.actorId
    let actor
    if (id) actor = game.actors.get(id)
    if (!actor) return
    const harmoniqueDice = actor.system.harmoniques[harmonique].valeur
    const deMerveilleux = dialogElement.querySelector("#deMerveilleux").checked
    const bonusAtouts = dialogElement.querySelector("#bonusAtouts").value
    const autreBonus = dialogElement.querySelector("#autreBonus").value

    let formule = deMerveilleux ? `1d20` : `1${harmoniqueDice}`
    if (bonusAtouts > 0) {
      formule += ` + ${bonusAtouts}d6`
    }
    if (autreBonus && PenombreRoll._isValidDiceFormula(autreBonus)) {
      formule += ` + ${autreBonus}`
    }
    dialogElement.querySelector("#formule").value = formule
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

  static _updateNbJetons(dialogElement) {
    const actorId = dialogElement.querySelector(".penombre-roll-dialog").dataset.actorId
    const actor = actorId ? game.actors.get(actorId) : null
    const maitriseSlug = dialogElement.querySelector("#effetMagiqueMaitrise")?.value || null
    const maitrise = actor && maitriseSlug ? actor.itemTypes.maitrise.find((m) => m.system.slug === maitriseSlug) : null

    // Coût en jetons d'après les options cochées (règles dans regles/jets.mjs)
    const cout = calculerCoutJetons({
      actionCollegiale: dialogElement.querySelector("#actionCollegiale")?.checked ?? false,
      messageLie: dialogElement.querySelector(".messageType").innerHTML === "lie",
      // Si on ne trouve pas la case, c'est une action collégiale liée
      actionCollegialeLiee: dialogElement.querySelector("#actionCollegiale")?.checked === undefined,
      premierAtoutCoche: dialogElement.querySelector("#actionCollegialePremierAtout")?.checked ?? false,
      nbAtouts: dialogElement.querySelectorAll(".atout.checked").length,
      nbFactionAtouts: dialogElement.querySelectorAll(".faction-atout.checked").length,
      deMerveilleux: dialogElement.querySelector("#deMerveilleux").checked,
      effetMagique: dialogElement.querySelector("#effetMagique")?.checked ?? false,
      niveauEffetMagique: Number(dialogElement.querySelector("#effetMagiqueNiveau")?.value || 1),
      niveauMaitrise: maitrise?.system.niveau || 0,
    })
    const { jetonsAtouts, premierAtoutGratuit, jetonActionCollegiale, jetonDeMerveilleux, jetonEffetMagique, jetonsEffetMagiqueMaitrise } = cout
    const nbAtoutsSelectionnes = dialogElement.querySelectorAll(".atout.checked").length
    const jetons = cout.total
    dialogElement.querySelector("#jetonsReserve").dataset.minimum = cout.jetonsReserveMinimum

    const jetonsInput = dialogElement.querySelector("#jetons")
    jetonsInput.dataset.total = jetons

    // Complication : n'est proposée que s'il reste des jetons à couvrir, et sa case dispensée ne peut
    // pas dépasser le coût total du jet (ni la limite de 3 jetons par complication)
    const complicationFieldset = dialogElement.querySelector(".complication-fieldset")
    const complicationUseCheckbox = dialogElement.querySelector("#complicationUse")
    if (complicationFieldset) {
      complicationFieldset.style.display = jetons > 0 ? "" : "none"
      if (jetons === 0 && complicationUseCheckbox?.checked) {
        complicationUseCheckbox.checked = false
        const details = dialogElement.querySelector(".complication-details")
        if (details) details.style.display = "none"
      }
    }
    const complicationJetonsSelect = dialogElement.querySelector("#complicationJetons")
    if (complicationJetonsSelect) {
      const maxComplication = Math.min(3, jetons)
      for (const option of complicationJetonsSelect.options) {
        option.disabled = Number(option.value) > maxComplication
      }
      if (maxComplication > 0 && Number(complicationJetonsSelect.value) > maxComplication) {
        complicationJetonsSelect.value = String(maxComplication)
      }
    }
    const jetonsComplication = PenombreRoll._getComplicationJetons(dialogElement)
    const jetonsARepartir = calculerJetonsARepartir(jetons, jetonsComplication)
    // Le champ affiché au joueur montre le nombre de jetons qu'il reste réellement à répartir
    jetonsInput.value = jetonsARepartir

    // Met à jour le tooltip pour expliquer chaque partie du total
    const tooltipLabel = dialogElement.querySelector("#jetonsDepenserTooltip")
    if (tooltipLabel) {
      const tooltipContent = `
        • Atouts : ${jetonsAtouts} ${nbAtoutsSelectionnes > 0 && premierAtoutGratuit ? "(Premier atout gratuit)" : ""}<br>
        • Action collégiale : ${jetonActionCollegiale} <br>
        • Dé merveilleux : ${jetonDeMerveilleux} <br>
        • Produire effet magique : ${jetonEffetMagique} <br>
        • Compenser maîtrise magique : ${jetonsEffetMagiqueMaitrise} <br>
        Total : ${jetons} <br>
        • Complication : -${jetonsComplication} <br>
        Reste à répartir : ${jetonsARepartir}`

      tooltipLabel.setAttribute("data-tooltip", tooltipContent)
    }

    PenombreRoll._validerJetons(dialogElement)
    return jetons
  }
  // #endregion Événements du prompt

  /** @override */
  async _prepareChatRenderContext({ flavor, isPrivate = false, ...options } = {}) {
    const rollResults = PenombreRoll.analyseRollResult(this)
    const nbSucces = rollResults.nbSucces
    // Fusion des événements spéciaux courants avec ceux accumulés lors des relances précédentes
    const accumulated = this.options.accumulated || {}
    const nbFaussesNotes = (accumulated.fausseNote || 0) + (rollResults.isDeHarmoniqueMin ? 1 : 0)
    const nbEnvolees = (accumulated.envolee || 0) + (rollResults.isDeHarmoniqueMax ? 1 : 0)
    const isFausseNote = nbFaussesNotes > 0
    const isEnvolee = nbEnvolees > 0
    let typeEnvolee = 1
    if (rollResults.typeDeHarmonique === 8 || rollResults.typeDeHarmonique === 10) typeEnvolee = 2
    else if (rollResults.typeDeHarmonique === 12) typeEnvolee = 3
    const nbIncidentsMagiques = (accumulated.incidentMagique || 0) + (rollResults.isDeMerveilleuxMin ? 1 : 0)
    const nbMerveilles = (accumulated.merveille || 0) + (rollResults.isDeMerveilleuxMax ? 1 : 0)
    const isIncidentMagique = nbIncidentsMagiques > 0
    const isMerveille = nbMerveilles > 0
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
      nbFaussesNotes,
      multipleFaussesNotes: nbFaussesNotes > 1,
      isEnvolee,
      nbEnvolees,
      multipleEnvolees: nbEnvolees > 1,
      typeEnvolee,
      isIncidentMagique,
      nbIncidentsMagiques,
      multipleIncidentsMagiques: nbIncidentsMagiques > 1,
      isMerveille,
      nbMerveilles,
      multipleMerveilles: nbMerveilles > 1,
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
    const resultat = analyserDes(roll.dice)
    if (CONFIG.debug.penombre?.rolls) console.debug("Pénombre | Roll | analyseRollResult", resultat)
    return resultat
  }

  /**
   * Fausse note sur un jet ayant utilisé un ou plusieurs atouts collégiaux : le niveau de l'un d'eux
   * (au choix des joueurs) baisse d'un niveau, et il est effacé s'il atteint 0.
   *
   * @param {Array<{factionId: string, elementId: string}>} factionAtoutsUsed Atouts de faction utilisés pour ce jet
   * @returns {Promise<void>}
   */
  static async _degraderAtoutFaction(factionAtoutsUsed) {
    if (!factionAtoutsUsed?.length) return
    if (!game.settings.get(SYSTEM.ID, "utiliserFactions")) return

    const reserveCollegiale = game.settings.get(SYSTEM.ID, "reserveCollegiale")
    const candidats = factionAtoutsUsed
      .map(({ factionId, elementId }) => ({ factionId, elementId, atout: reserveCollegiale.factions?.[factionId]?.atouts?.[elementId] }))
      .filter((candidat) => candidat.atout)
    if (!candidats.length) return

    let choix = candidats[0]
    if (candidats.length > 1) {
      const options = candidats
        .map(
          (candidat, index) =>
            `<label><input type="radio" name="atoutDegrade" value="${index}" ${index === 0 ? "checked" : ""}/> ${candidat.atout.nom} (${reserveCollegiale.factions[candidat.factionId].nom})</label>`,
        )
        .join("<br/>")
      const result = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("PENOMBRE.Factions.choisirAtoutDegrade") },
        content: `<div class="form-group">${options}</div>`,
        rejectClose: false,
        buttons: [
          {
            action: "choisir",
            label: game.i18n.localize("PENOMBRE.Factions.choisir"),
            default: true,
            callback: (evt, button) => Number(new FormData(button.form).get("atoutDegrade")),
          },
        ],
      })
      if (result === null) return
      choix = candidats[result]
    }

    const libelle = { nom: choix.atout.nom, faction: reserveCollegiale.factions[choix.factionId].nom }
    const { ok } = await demanderAuMJ("penombre.decrementFactionAtout", { factionId: choix.factionId, elementId: choix.elementId })
    if (ok) ui.notifications.info(game.i18n.format("PENOMBRE.Factions.atoutDegrade", libelle))
    else ui.notifications.warn(game.i18n.format("PENOMBRE.Factions.atoutADegrader", libelle), { permanent: true })
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
      const { whisper, blind } = PenombreRoll._visibiliteDSN(roll.options.rollMode)

      if (CONFIG.debug.penombre?.rolls && roll) console.debug("Pénombre | Reroll", roll, rerolledDices)

      const newRolls = []

      // Sauvegarde des événements spéciaux (fausse note, envolée, etc.) avant modification des dés
      // Ces événements sont cumulatifs : un 1 suivi d'une relance à 8 produit une fausse note ET une envolée
      // On n'accumule que pour les dés effectivement relancés, sinon l'événement persiste dans l'analyse courante
      const harmoniqueRelance = rerolledDices.some((indice) => indice.startsWith("0-"))
      const merveilleuxRelance = rerolledDices.some((indice) => {
        const [dieIndex] = indice.split("-").map(Number)
        return roll.dice[dieIndex]?.faces === MERVEILLEUX_FACES
      })
      const preAnalysis = PenombreRoll.analyseRollResult(roll)
      if (!roll.options.accumulated) {
        roll.options.accumulated = { fausseNote: 0, envolee: 0, incidentMagique: 0, merveille: 0 }
      }
      if (harmoniqueRelance && preAnalysis.isDeHarmoniqueMin) roll.options.accumulated.fausseNote++
      if (harmoniqueRelance && preAnalysis.isDeHarmoniqueMax) roll.options.accumulated.envolee++
      if (merveilleuxRelance && preAnalysis.isDeMerveilleuxMin) roll.options.accumulated.incidentMagique++
      if (merveilleuxRelance && preAnalysis.isDeMerveilleuxMax) roll.options.accumulated.merveille++

      // TODO : Lorsque le système de dés Pénombre sera géré : gérer la relance d'un dé merveilleux
      for (const indice of rerolledDices) {
        const [dieIndex, resultIndex] = indice.split("-").map(Number)
        if (roll.dice[dieIndex] && roll.dice[dieIndex].results[resultIndex]) {
          const formula = `1d${roll.dice[dieIndex].faces}`
          const newDice = await new Roll(formula, {}, { rollMode: roll.options.rollMode }).evaluate()

          if (game.modules.get("dice-so-nice")?.active) {
            const desSpeciaux = game.settings.get(SYSTEM.ID, "desSpeciaux")
            const desSpeciauxTexture = game.settings.get(SYSTEM.ID, "desSpeciauxTexture")
            if (game.dice3d.getLoadedDiceSystems().has("penombre") && desSpeciaux) {
              const colorset = (dieIndex === 0 || newDice.dice[0].faces === MERVEILLEUX_FACES) ? "penombre-beige" : "penombre-bleu"
              newDice.dice[0].options.appearance = PenombreRoll._getDiceAppearance(colorset, desSpeciauxTexture)
            } else {
              newDice.dice[0].options.appearance = { system: "standard" }
            }
          }

          newRolls.push(newDice)
          roll.dice[dieIndex].results[resultIndex].result = parseInt(newDice.result)
          // Recalcul du _total du dé après mutation du résultat
          roll.dice[dieIndex]._total = roll.dice[dieIndex].results.filter((r) => !r.discarded).reduce((sum, r) => sum + r.result, 0)
        }
      }

      // Recalcul du total global du roll
      roll._total = roll.dice.reduce((sum, die) => sum + die.total, 0)

      // Gestion des effets de jetons si le dé harmonique (index 0) a été relancé
      const harmoniqueRerolled = rerolledDices.some((indice) => indice.startsWith("0-"))
      if (harmoniqueRerolled) {
        const postAnalysis = PenombreRoll.analyseRollResult(roll)
        const actorId = roll.options.actorId || message.speaker.actor
        const rerollActor = actorId ? game.actors.get(actorId) : null
        if (rerollActor?.type === "eminence") {
          // Fausse note (1 sur le dé harmonique) : perte d'un jeton
          if (postAnalysis.isDeHarmoniqueMin) {
            await rerollActor.system.perdreUnJeton()
          }
          // Envolée (max sur le dé harmonique) : réactivation d'un jeton inactif
          if (postAnalysis.isDeHarmoniqueMax) {
            await rerollActor.system.regagnerUnJeton()
          }
        }
        // Fausse note sur un jet ayant utilisé un atout collégial : son niveau baisse de 1
        if (postAnalysis.isDeHarmoniqueMin) {
          await PenombreRoll._degraderAtoutFaction(roll.options.factionAtoutsUsed)
        }
      }

      // Affichage groupé de tous les nouveaux dés avec Dice So Nice
      if (game.modules.get("dice-so-nice")?.active && newRolls.length > 0) {
        const synchronize = !game.user.isGM
        // Paramètres : roll, user, synchronize, whisper, blind
        // * @param {Boolean} synchronize if the animation needs to be shown to other players. Default: false
        // * @param {Array} whisper list of users or userId who can see the roll, set it to null if everyone can see. Default: null
        // * @param {Boolean} blind if the roll is blind for the current user. Default: false

        const showPromises = newRolls.map((newDice) => game.dice3d.showForRoll(newDice, game.user, synchronize, whisper, blind))
        await Promise.all(showPromises)
      }

      await message.update({ rolls: [roll] })
    }
  }
}
