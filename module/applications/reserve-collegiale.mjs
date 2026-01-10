const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api
import { SYSTEM } from "../config/system.mjs"

/**
 * Une application pour gérer la réserve collégiale
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class PenombreReserveCollegiale extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: "penombre-reserve-collegiale",
    tag: "form",
    window: {
      contentClasses: ["penombre-reserve-collegiale-content"],
      title: "PENOMBRE.ReserveCollegiale.title",
      controls: [],
    },
    position: {
      width: 585,
      top: 80,
      left: 150,
    },
    form: {
      closeOnSubmit: true,
    },
    actions: {
      jeton: PenombreReserveCollegiale.#onClicJeton,
      createFaction: PenombreReserveCollegiale.#onCreateFaction,
      deleteFaction: PenombreReserveCollegiale.#onDeleteFaction,
      createFactionAtout: PenombreReserveCollegiale.#onCreateFactionAtout,
      createFactionComplication: PenombreReserveCollegiale.#onCreateFactionComplication,
      deleteFactionElement: PenombreReserveCollegiale.#onDeleteFactionElement,
      changeFactionElementValeur: PenombreReserveCollegiale.#onChangeFactionElementValeur,
    },
  }

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options)
    applicationOptions.window.resizable = game.settings.get("penombre", "styleJeu") !== "demo"
    return applicationOptions
  }

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/reserve-collegiale.hbs",
    },
  }

  /** @override */
  async _prepareContext(_options = {}) {
    const styleJeu = await game.settings.get("penombre", "styleJeu")
    const reserveCollegiale = await game.settings.get(SYSTEM.ID, "reserveCollegiale")

    return {
      userId: game.user.id,
      isGM: game.user.isGM,
      jetons: reserveCollegiale.jetons,
      factions: reserveCollegiale.factions || {},

      isStyleJeuStandard: styleJeu === "standard",
      isStyleJeuAvance: styleJeu === "avance",
    }
  }

  /**
   * Handle clicking on Document's elements.
   * @param {Event} event The click event triggered by the user.
   * @param {HTMLElement} target The HTML element that was clicked, containing dataset information.
   * @returns {Promise<void>}
   **/
  static async #onClicJeton(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const index = dataset.index // Commence à 1

    // Le MJ peut modifier les settings
    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      reserveCollegiale.jetons[index].valeur = !reserveCollegiale.jetons[index].valeur
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    }
    // C'est un joueur : utilisation de la requête
    else {
      await game.users.activeGM.query("penombre.updateReserveCollegiale", { index })
    }

    this.render({ force: true })
  }

  /**
   * Updates the "reserveCollegiale" setting by setting a specified number of jetons' "valeur" property from true to false.
   *
   * @async
   * @param {Object} params  The parameters object.
   * @param {number} params.index The index of the jeton to update.
   * @returns {Promise<void>} Resolves when the reserveCollegiale setting has been updated.
   */
  static _handleQueryUpdateReserveCollegiale = async ({ index }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    reserveCollegiale.jetons[index].valeur = !reserveCollegiale.jetons[index].valeur
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /**
   * Updates the "reserveCollegiale" setting by setting a specified number of jetons' "valeur" property from true to false.
   *
   * @async
   * @param {Object} params  The parameters object.
   * @param {number} params.nbJetons The number of jetons to update from true to false.
   * @returns {Promise<void>} Resolves when the reserveCollegiale setting has been updated.
   */
  static _handleQueryUpdateReserveCollegialeFromRoll = async ({ nbJetons }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))

    // Parcours de l'objet pour mettre à jour nbJetons
    let nbJetonsModifies = 0
    for (const [index, jeton] of Object.entries(reserveCollegiale.jetons)) {
      if (jeton.valeur === true && nbJetonsModifies < nbJetons) {
        reserveCollegiale.jetons[index].valeur = false
        nbJetonsModifies++
      }
    }

    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  // #region Actions Factions

  /**
   * Crée une nouvelle faction.
   * @param {Event} event L'événement déclencheur
   * @param {HTMLElement} target L'élément HTML cible
   */
  static async #onCreateFaction(event, target) {
    event.preventDefault()
    const newFactionId = foundry.utils.randomID()

    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      if (!reserveCollegiale.factions) reserveCollegiale.factions = {}
      reserveCollegiale.factions[newFactionId] = {
        nom: game.i18n.localize("PENOMBRE.Factions.nouvelleFaction"),
        atouts: {},
        complications: {},
      }
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    } else {
      await game.users.activeGM.query("penombre.createFaction", { factionId: newFactionId })
    }
    this.render({ force: true })
  }

  /**
   * Supprime une faction.
   * @param {Event} event L'événement déclencheur
   * @param {HTMLElement} target L'élément HTML cible
   */
  static async #onDeleteFaction(event, target) {
    event.preventDefault()
    const factionId = target.dataset.factionId

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("PENOMBRE.Factions.supprimerFaction") },
      content: game.i18n.localize("PENOMBRE.Factions.confirmerSuppression"),
    })
    if (!confirmed) return

    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      delete reserveCollegiale.factions[factionId]
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    } else {
      await game.users.activeGM.query("penombre.deleteFaction", { factionId })
    }
    this.render({ force: true })
  }

  /**
   * Crée un atout pour une faction.
   * @param {Event} event L'événement déclencheur
   * @param {HTMLElement} target L'élément HTML cible
   */
  static async #onCreateFactionAtout(event, target) {
    event.preventDefault()
    const factionId = target.dataset.factionId
    const elementId = foundry.utils.randomID()

    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      if (!reserveCollegiale.factions[factionId].atouts) reserveCollegiale.factions[factionId].atouts = {}
      reserveCollegiale.factions[factionId].atouts[elementId] = {
        nom: game.i18n.localize("PENOMBRE.Factions.nouvelAtout"),
        valeur: 1,
      }
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    } else {
      await game.users.activeGM.query("penombre.createFactionElement", { factionId, elementId, elementType: "atout" })
    }
    this.render({ force: true })
  }

  /**
   * Crée une complication pour une faction.
   * @param {Event} event L'événement déclencheur
   * @param {HTMLElement} target L'élément HTML cible
   */
  static async #onCreateFactionComplication(event, target) {
    event.preventDefault()
    const factionId = target.dataset.factionId
    const elementId = foundry.utils.randomID()

    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      if (!reserveCollegiale.factions[factionId].complications) reserveCollegiale.factions[factionId].complications = {}
      reserveCollegiale.factions[factionId].complications[elementId] = {
        nom: game.i18n.localize("PENOMBRE.Factions.nouvelleComplication"),
        valeur: 1,
      }
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    } else {
      await game.users.activeGM.query("penombre.createFactionElement", { factionId, elementId, elementType: "complication" })
    }
    this.render({ force: true })
  }

  /**
   * Supprime un atout ou une complication d'une faction.
   * @param {Event} event L'événement déclencheur
   * @param {HTMLElement} target L'élément HTML cible
   */
  static async #onDeleteFactionElement(event, target) {
    event.preventDefault()
    const { factionId, elementId, elementType } = target.dataset

    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      const collection = elementType === "atout" ? "atouts" : "complications"
      delete reserveCollegiale.factions[factionId][collection][elementId]
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    } else {
      await game.users.activeGM.query("penombre.deleteFactionElement", { factionId, elementId, elementType })
    }
    this.render({ force: true })
  }

  /**
   * Change la valeur d'un atout ou complication de faction.
   * @param {Event} event L'événement déclencheur
   * @param {HTMLElement} target L'élément HTML cible
   */
  static async #onChangeFactionElementValeur(event, target) {
    event.preventDefault()
    const { factionId, elementId, elementType, valeur } = target.dataset
    const newValeur = Number(valeur)

    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      const collection = elementType === "atout" ? "atouts" : "complications"
      reserveCollegiale.factions[factionId][collection][elementId].valeur = newValeur
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    } else {
      await game.users.activeGM.query("penombre.updateFactionElement", { factionId, elementId, elementType, field: "valeur", value: newValeur })
    }
    this.render({ force: true })
  }

  // #endregion Actions Factions

  // #region Gestion des événements de rendu

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options)

    // Gestion des changements de nom de faction
    const factionNomInputs = this.element.querySelectorAll(".faction-nom")
    factionNomInputs.forEach((input) => {
      input.addEventListener("blur", (evt) => this.#onChangeFactionName(evt))
    })

    // Gestion des changements de nom d'élément (atout/complication)
    const elementNomInputs = this.element.querySelectorAll(".element-nom")
    elementNomInputs.forEach((input) => {
      input.addEventListener("blur", (evt) => this.#onChangeElementName(evt))
    })
  }

  /**
   * Gère le changement de nom d'une faction.
   * @param {Event} event L'événement blur
   */
  async #onChangeFactionName(event) {
    const input = event.target
    const factionId = input.dataset.factionId
    const newNom = input.value.trim()

    if (!newNom) return

    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      reserveCollegiale.factions[factionId].nom = newNom
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    } else {
      await game.users.activeGM.query("penombre.updateFactionName", { factionId, nom: newNom })
    }
  }

  /**
   * Gère le changement de nom d'un élément (atout ou complication).
   * @param {Event} event L'événement blur
   */
  async #onChangeElementName(event) {
    const input = event.target
    const { factionId, elementId, elementType } = input.dataset
    const newNom = input.value.trim()

    if (!newNom) return

    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      const collection = elementType === "atout" ? "atouts" : "complications"
      reserveCollegiale.factions[factionId][collection][elementId].nom = newNom
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    } else {
      await game.users.activeGM.query("penombre.updateFactionElement", { factionId, elementId, elementType, field: "nom", value: newNom })
    }
  }

  // #endregion Gestion des événements de rendu

  // #region Query handlers pour les factions

  /**
   * Crée une nouvelle faction (appelé par query depuis un joueur).
   * @param {object} params Paramètres
   * @param {string} params.factionId L'identifiant de la nouvelle faction
   */
  static _handleQueryCreateFaction = async ({ factionId }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    if (!reserveCollegiale.factions) reserveCollegiale.factions = {}
    reserveCollegiale.factions[factionId] = {
      nom: game.i18n.localize("PENOMBRE.Factions.nouvelleFaction"),
      atouts: {},
      complications: {},
    }
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /**
   * Supprime une faction (appelé par query depuis un joueur).
   * @param {object} params Paramètres
   * @param {string} params.factionId L'identifiant de la faction à supprimer
   */
  static _handleQueryDeleteFaction = async ({ factionId }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    delete reserveCollegiale.factions[factionId]
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /**
   * Crée un élément (atout ou complication) dans une faction (appelé par query depuis un joueur).
   * @param {object} params Paramètres
   * @param {string} params.factionId L'identifiant de la faction
   * @param {string} params.elementId L'identifiant du nouvel élément
   * @param {string} params.elementType Le type d'élément ('atout' ou 'complication')
   */
  static _handleQueryCreateFactionElement = async ({ factionId, elementId, elementType }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    const collection = elementType === "atout" ? "atouts" : "complications"
    const defaultName = elementType === "atout" ? game.i18n.localize("PENOMBRE.Factions.nouvelAtout") : game.i18n.localize("PENOMBRE.Factions.nouvelleComplication")
    if (!reserveCollegiale.factions[factionId][collection]) reserveCollegiale.factions[factionId][collection] = {}
    reserveCollegiale.factions[factionId][collection][elementId] = { nom: defaultName, valeur: 1 }
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /**
   * Supprime un élément d'une faction (appelé par query depuis un joueur).
   * @param {object} params Paramètres
   * @param {string} params.factionId L'identifiant de la faction
   * @param {string} params.elementId L'identifiant de l'élément à supprimer
   * @param {string} params.elementType Le type d'élément ('atout' ou 'complication')
   */
  static _handleQueryDeleteFactionElement = async ({ factionId, elementId, elementType }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    const collection = elementType === "atout" ? "atouts" : "complications"
    delete reserveCollegiale.factions[factionId][collection][elementId]
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /**
   * Met à jour un champ d'un élément de faction (appelé par query depuis un joueur).
   * @param {object} params Paramètres
   * @param {string} params.factionId L'identifiant de la faction
   * @param {string} params.elementId L'identifiant de l'élément
   * @param {string} params.elementType Le type d'élément ('atout' ou 'complication')
   * @param {string} params.field Le champ à mettre à jour ('nom' ou 'valeur')
   * @param {string|number} params.value La nouvelle valeur
   */
  static _handleQueryUpdateFactionElement = async ({ factionId, elementId, elementType, field, value }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    const collection = elementType === "atout" ? "atouts" : "complications"
    reserveCollegiale.factions[factionId][collection][elementId][field] = value
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /**
   * Met à jour le nom d'une faction (appelé par query depuis un joueur).
   * @param {object} params Paramètres
   * @param {string} params.factionId L'identifiant de la faction
   * @param {string} params.nom Le nouveau nom
   */
  static _handleQueryUpdateFactionName = async ({ factionId, nom }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    reserveCollegiale.factions[factionId].nom = nom
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  // #endregion Query handlers pour les factions
}
