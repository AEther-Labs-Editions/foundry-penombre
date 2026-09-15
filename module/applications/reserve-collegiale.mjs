const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api
import { SYSTEM } from "../config/system.mjs"

/**
 * Une application pour gérer la réserve collégiale, le potentiel collégial et les factions.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class PenombreReserveCollegiale extends HandlebarsApplicationMixin(ApplicationV2) {
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  _sheetMode = PenombreReserveCollegiale.SHEET_MODES.PLAY

  _collapsedFactions = new Set()

  get isPlayMode() {
    return this._sheetMode === PenombreReserveCollegiale.SHEET_MODES.PLAY
  }

  get isEditMode() {
    return this._sheetMode === PenombreReserveCollegiale.SHEET_MODES.EDIT
  }

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
      toggleFaction: PenombreReserveCollegiale.#onToggleFaction,
      createFaction: PenombreReserveCollegiale.#onCreateFaction,
      deleteFaction: PenombreReserveCollegiale.#onDeleteFaction,
      createFactionAtout: PenombreReserveCollegiale.#onCreateFactionAtout,
      createFactionComplication: PenombreReserveCollegiale.#onCreateFactionComplication,
      deleteFactionElement: PenombreReserveCollegiale.#onDeleteFactionElement,
      changeFactionElementValeur: PenombreReserveCollegiale.#onChangeFactionElementValeur,
      imposeComplication: PenombreReserveCollegiale.#onImposeComplication,
    },
  }

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options)
    const styleJeu = game.settings.get(SYSTEM.ID, "styleJeu")
    const nbJetons = game.settings.get(SYSTEM.ID, "nbJetons")
    const useImageDisplay = styleJeu === "demo" || nbJetons === 10
    const showFactions = styleJeu !== "demo" && game.settings.get(SYSTEM.ID, "utiliserFactions")
    applicationOptions.window.resizable = styleJeu !== "demo" && nbJetons !== 10
    if (showFactions) {
      applicationOptions.position.width = useImageDisplay ? 900 : 870
    }
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
    const styleJeu = game.settings.get(SYSTEM.ID, "styleJeu")
    const nbJetons = game.settings.get(SYSTEM.ID, "nbJetons")
    const reserveCollegiale = game.settings.get(SYSTEM.ID, "reserveCollegiale")
    const unlocked = game.user.isGM && this.isEditMode

    return {
      userId: game.user.id,
      isGM: game.user.isGM,
      unlocked,
      locked: !unlocked,
      jetons: reserveCollegiale.jetons,
      potentiel: reserveCollegiale.potentiel,
      factions: reserveCollegiale.factions || {},
      showFactions: styleJeu !== "demo" && game.settings.get(SYSTEM.ID, "utiliserFactions"),
      useImageDisplay: styleJeu === "demo" || nbJetons === 10,
    }
  }

  // #region Mutations (source de vérité unique, utilisée directement par le MJ ou via les query handlers)

  /**
   * @param {function(object): void} modifier
   */
  static async _updateReserve(modifier) {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    modifier(reserveCollegiale)
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /** @param {string} index */
  static async _mutateToggleJeton(index) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      r.jetons[index].valeur = !r.jetons[index].valeur
    })
  }

  /** @param {number} nbJetons */
  static async _mutateReserveFromRoll(nbJetons) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      let nbJetonsModifies = 0
      for (const jeton of Object.values(r.jetons)) {
        if (jeton.valeur === true && nbJetonsModifies < nbJetons) {
          jeton.valeur = false
          nbJetonsModifies++
        }
      }
    })
  }

  /** @param {number} nbJetons Nombre de jetons à activer (créditer) dans la réserve */
  static async _mutateCrediterJetons(nbJetons) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      let nbJetonsModifies = 0
      for (const jeton of Object.values(r.jetons)) {
        if (jeton.valeur === false && nbJetonsModifies < nbJetons) {
          jeton.valeur = true
          nbJetonsModifies++
        }
      }
    })
  }

  /** @param {string} factionId */
  static async _mutateCreateFaction(factionId) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      if (!r.factions) r.factions = {}
      r.factions[factionId] = {
        nom: game.i18n.localize("PENOMBRE.Factions.nouvelleFaction"),
        atouts: {},
        complications: {},
      }
    })
  }

  /** @param {string} factionId */
  static async _mutateDeleteFaction(factionId) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      delete r.factions[factionId]
    })
  }

  /**
   * Crée un atout collégial pour une faction. Coûte 1 point de potentiel collégial.
   * Si `avecComplication` est vrai, l'atout est créé au niveau 2 et une complication de la même faction
   * est créée (ou augmentée d'un niveau si elle existe déjà), pour le même coût.
   * @param {string} factionId
   * @param {string} elementId
   * @param {boolean} avecComplication
   */
  static async _mutateCreateFactionAtout(factionId, elementId, avecComplication) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const faction = r.factions[factionId]
      if (!faction) return
      if (Object.keys(faction.atouts || {}).length >= 3) return
      if (r.potentiel <= 0) return

      r.potentiel -= 1
      if (!faction.atouts) faction.atouts = {}
      faction.atouts[elementId] = {
        nom: game.i18n.localize("PENOMBRE.Factions.nouvelAtout"),
        valeur: avecComplication ? 2 : 1,
      }

      if (avecComplication) {
        if (!faction.complications) faction.complications = {}
        const complicationIds = Object.keys(faction.complications)
        if (complicationIds.length > 0) {
          const existing = faction.complications[complicationIds[0]]
          existing.valeur = Math.min(existing.valeur + 1, 3)
        } else {
          faction.complications[foundry.utils.randomID()] = {
            nom: game.i18n.localize("PENOMBRE.Factions.nouvelleComplication"),
            valeur: 1,
          }
        }
      }
    })
  }

  /**
   * Crée une complication collégiale pour une faction (création manuelle, hors jet).
   * @param {string} factionId
   * @param {string} elementId
   */
  static async _mutateCreateFactionComplication(factionId, elementId) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const faction = r.factions[factionId]
      if (!faction) return
      if (Object.keys(faction.complications || {}).length >= 1) return
      if (!faction.complications) faction.complications = {}
      faction.complications[elementId] = {
        nom: game.i18n.localize("PENOMBRE.Factions.nouvelleComplication"),
        valeur: 1,
      }
    })
  }

  /**
   * @param {string} factionId
   * @param {string} elementId
   * @param {"atout"|"complication"} elementType
   */
  static async _mutateDeleteFactionElement(factionId, elementId, elementType) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const collection = elementType === "atout" ? "atouts" : "complications"
      delete r.factions[factionId]?.[collection]?.[elementId]
    })
  }

  /**
   * Change le niveau d'un atout ou d'une complication de faction.
   * Cliquer sur la case déjà remplie la plus basse d'une complication la retire (toutes les cases décochées).
   * @param {string} factionId
   * @param {string} elementId
   * @param {"atout"|"complication"} elementType
   * @param {number} valeur
   */
  static async _mutateChangeFactionElementValeur(factionId, elementId, elementType, valeur) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const collection = elementType === "atout" ? "atouts" : "complications"
      const element = r.factions[factionId]?.[collection]?.[elementId]
      if (!element) return

      if (elementType === "complication" && valeur === 1 && element.valeur === 1) {
        delete r.factions[factionId].complications[elementId]
        return
      }
      element.valeur = valeur
    })
  }

  /**
   * @param {string} factionId
   * @param {string} elementId
   * @param {"atout"|"complication"} elementType
   * @param {string} nom
   */
  static async _mutateUpdateFactionElementNom(factionId, elementId, elementType, nom) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const collection = elementType === "atout" ? "atouts" : "complications"
      const element = r.factions[factionId]?.[collection]?.[elementId]
      if (element) element.nom = nom
    })
  }

  /**
   * @param {string} factionId
   * @param {string} nom
   */
  static async _mutateUpdateFactionNom(factionId, nom) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      if (r.factions[factionId]) r.factions[factionId].nom = nom
    })
  }

  /**
   * Convertit des jetons économisés lors d'un jet en une complication collégiale pour une faction.
   * Crée la complication si la faction n'en a pas, ou augmente son niveau (max 3) sinon.
   * @param {string} factionId
   * @param {number} niveau
   * @param {string} [nom] Description de la complication, utilisée seulement à la création
   */
  static async _mutateAddFactionComplicationFromRoll(factionId, niveau, nom) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const faction = r.factions[factionId]
      if (!faction) return
      if (!faction.complications) faction.complications = {}
      const complicationIds = Object.keys(faction.complications)
      if (complicationIds.length > 0) {
        const existing = faction.complications[complicationIds[0]]
        existing.valeur = Math.min(existing.valeur + niveau, 3)
      } else {
        faction.complications[foundry.utils.randomID()] = {
          nom: nom || game.i18n.localize("PENOMBRE.Factions.complicationDepuisJet"),
          valeur: Math.min(niveau, 3),
        }
      }
    })
  }

  /**
   * Fausse note ou envolée sur un jet ayant utilisé un atout collégial : son niveau baisse de 1.
   * L'atout est effacé s'il atteint 0.
   * @param {string} factionId
   * @param {string} elementId
   */
  static async _mutateDecrementFactionAtout(factionId, elementId) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const atout = r.factions[factionId]?.atouts?.[elementId]
      if (!atout) return
      if (atout.valeur <= 1) {
        delete r.factions[factionId].atouts[elementId]
      } else {
        atout.valeur -= 1
      }
    })
  }

  /** @param {number} valeur */
  static async _mutatePotentiel(valeur) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      r.potentiel = Math.max(0, Number(valeur) || 0)
    })
  }

  // #endregion Mutations

  // #region Actions déclenchées côté client

  static #onToggleFaction(event, target) {
    event.preventDefault()
    const factionId = target.dataset.factionId
    const factionEl = this.element.querySelector(`.faction[data-faction-id="${factionId}"]`)
    if (!factionEl) return

    if (this._collapsedFactions.has(factionId)) {
      this._collapsedFactions.delete(factionId)
      factionEl.classList.remove("collapsed")
    } else {
      this._collapsedFactions.add(factionId)
      factionEl.classList.add("collapsed")
    }
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   **/
  static async #onClicJeton(event, target) {
    event.preventDefault()
    const index = target.dataset.index

    if (game.user.isGM) await PenombreReserveCollegiale._mutateToggleJeton(index)
    else await game.users.activeGM.query("penombre.updateReserveCollegiale", { index })

    this.render({ force: true })
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onCreateFaction(event, target) {
    event.preventDefault()
    const factionId = foundry.utils.randomID()

    if (game.user.isGM) await PenombreReserveCollegiale._mutateCreateFaction(factionId)
    else await game.users.activeGM.query("penombre.createFaction", { factionId })

    this.render({ force: true })
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onDeleteFaction(event, target) {
    event.preventDefault()
    const factionId = target.dataset.factionId

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("PENOMBRE.Factions.supprimerFaction") },
      content: game.i18n.localize("PENOMBRE.Factions.confirmerSuppression"),
    })
    if (!confirmed) return

    if (game.user.isGM) await PenombreReserveCollegiale._mutateDeleteFaction(factionId)
    else await game.users.activeGM.query("penombre.deleteFaction", { factionId })

    this.render({ force: true })
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onCreateFactionAtout(event, target) {
    event.preventDefault()
    const factionId = target.dataset.factionId

    const reserveCollegiale = game.settings.get(SYSTEM.ID, "reserveCollegiale")
    const faction = reserveCollegiale.factions[factionId]
    if (Object.keys(faction?.atouts || {}).length >= 3) {
      ui.notifications.warn(game.i18n.localize("PENOMBRE.Factions.limiteAtouts"))
      return
    }
    if (reserveCollegiale.potentiel <= 0) {
      ui.notifications.warn(game.i18n.localize("PENOMBRE.Factions.potentielEpuise"))
      return
    }

    const dialogResult = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("PENOMBRE.Factions.ajouterAtout") },
      content: `<div class="form-group"><label>
        <input type="checkbox" id="avecComplication" name="avecComplication"/>
        ${game.i18n.localize("PENOMBRE.Factions.avecComplication")}
      </label></div>`,
      rejectClose: false,
      buttons: [
        {
          action: "create",
          label: game.i18n.localize("PENOMBRE.Factions.creer"),
          default: true,
          callback: (evt, button) => button.form.elements.avecComplication.checked,
        },
      ],
    })
    if (dialogResult === null) return

    const elementId = foundry.utils.randomID()
    if (game.user.isGM) await PenombreReserveCollegiale._mutateCreateFactionAtout(factionId, elementId, dialogResult)
    else await game.users.activeGM.query("penombre.createFactionAtout", { factionId, elementId, avecComplication: dialogResult })

    this.render({ force: true })
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onCreateFactionComplication(event, target) {
    event.preventDefault()
    const factionId = target.dataset.factionId

    const reserveCollegiale = game.settings.get(SYSTEM.ID, "reserveCollegiale")
    if (Object.keys(reserveCollegiale.factions[factionId]?.complications || {}).length >= 1) {
      ui.notifications.warn(game.i18n.localize("PENOMBRE.Factions.limiteComplications"))
      return
    }

    const elementId = foundry.utils.randomID()
    if (game.user.isGM) await PenombreReserveCollegiale._mutateCreateFactionComplication(factionId, elementId)
    else await game.users.activeGM.query("penombre.createFactionComplication", { factionId, elementId })

    this.render({ force: true })
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onDeleteFactionElement(event, target) {
    event.preventDefault()
    const { factionId, elementId, elementType } = target.dataset

    if (game.user.isGM) await PenombreReserveCollegiale._mutateDeleteFactionElement(factionId, elementId, elementType)
    else await game.users.activeGM.query("penombre.deleteFactionElement", { factionId, elementId, elementType })

    this.render({ force: true })
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onChangeFactionElementValeur(event, target) {
    event.preventDefault()
    const { factionId, elementId, elementType, valeur } = target.dataset
    const newValeur = Number(valeur)

    if (game.user.isGM) await PenombreReserveCollegiale._mutateChangeFactionElementValeur(factionId, elementId, elementType, newValeur)
    else await game.users.activeGM.query("penombre.updateFactionElementValeur", { factionId, elementId, elementType, valeur: newValeur })

    this.render({ force: true })
  }

  /**
   * Le MJ impose une complication : crédite la réserve collégiale d'autant de jetons que le niveau de la complication.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onImposeComplication(event, target) {
    event.preventDefault()
    const { factionId, elementId } = target.dataset
    const reserveCollegiale = game.settings.get(SYSTEM.ID, "reserveCollegiale")
    const complication = reserveCollegiale.factions[factionId]?.complications?.[elementId]
    if (!complication) return

    await PenombreReserveCollegiale._mutateCrediterJetons(complication.valeur)
    ui.notifications.info(game.i18n.format("PENOMBRE.Factions.complicationImposee", { nb: complication.valeur }))
    this.render({ force: true })
  }

  // #endregion Actions déclenchées côté client

  // #region Gestion des événements de rendu

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options)
    this.#renderModeToggle()

    for (const factionId of this._collapsedFactions) {
      const factionEl = this.element.querySelector(`.faction[data-faction-id="${factionId}"]`)
      if (factionEl) factionEl.classList.add("collapsed")
    }

    if (context.unlocked) {
      this.element.querySelectorAll(".faction-nom").forEach((input) => input.addEventListener("blur", (evt) => this.#onChangeFactionName(evt)))
      this.element.querySelectorAll(".element-nom").forEach((input) => input.addEventListener("blur", (evt) => this.#onChangeElementName(evt)))

      const potentielInput = this.element.querySelector(".potentiel-valeur")
      if (potentielInput) potentielInput.addEventListener("change", (evt) => this.#onChangePotentiel(evt))
    }
  }

  #renderModeToggle() {
    if (!game.user.isGM) return

    const header = this.element.querySelector(".window-header")
    const existing = header.querySelector(".mode-slider")
    if (existing) {
      existing.checked = this.isEditMode
      return
    }

    const toggle = document.createElement("penombre-toggle-switch")
    toggle.checked = this.isEditMode
    toggle.classList.add("mode-slider")
    toggle.dataset.tooltip = "PENOMBRE.ui.modeEdition"
    toggle.dataset.tooltipDirection = "UP"
    toggle.setAttribute("aria-label", game.i18n.localize("PENOMBRE.ui.modeEdition"))
    toggle.addEventListener("change", this.#onChangeLock.bind(this))
    toggle.addEventListener("dblclick", (event) => event.stopPropagation())
    toggle.addEventListener("pointerdown", (event) => event.stopPropagation())
    header.prepend(toggle)
  }

  #onChangeLock(event) {
    event.preventDefault()
    const modes = PenombreReserveCollegiale.SHEET_MODES
    this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT
    this.render()
  }

  /** @param {Event} event */
  async #onChangeFactionName(event) {
    const input = event.target
    const factionId = input.dataset.factionId
    const nom = input.value.trim()
    if (!nom) return

    if (game.user.isGM) await PenombreReserveCollegiale._mutateUpdateFactionNom(factionId, nom)
    else await game.users.activeGM.query("penombre.updateFactionName", { factionId, nom })
  }

  /** @param {Event} event */
  async #onChangeElementName(event) {
    const input = event.target
    const { factionId, elementId, elementType } = input.dataset
    const nom = input.value.trim()
    if (!nom) return

    if (game.user.isGM) await PenombreReserveCollegiale._mutateUpdateFactionElementNom(factionId, elementId, elementType, nom)
    else await game.users.activeGM.query("penombre.updateFactionElementNom", { factionId, elementId, elementType, nom })
  }

  /** @param {Event} event Uniquement accessible au MJ : pas de query nécessaire */
  async #onChangePotentiel(event) {
    await PenombreReserveCollegiale._mutatePotentiel(event.target.value)
  }

  // #endregion Gestion des événements de rendu

  // #region Query handlers (appelés par le MJ actif à la demande d'un joueur)

  /** @param {{index: string}} params */
  static _handleQueryUpdateReserveCollegiale = async ({ index }) => PenombreReserveCollegiale._mutateToggleJeton(index)

  /** @param {{nbJetons: number}} params */
  static _handleQueryUpdateReserveCollegialeFromRoll = async ({ nbJetons }) => PenombreReserveCollegiale._mutateReserveFromRoll(nbJetons)

  /** @param {{factionId: string}} params */
  static _handleQueryCreateFaction = async ({ factionId }) => PenombreReserveCollegiale._mutateCreateFaction(factionId)

  /** @param {{factionId: string}} params */
  static _handleQueryDeleteFaction = async ({ factionId }) => PenombreReserveCollegiale._mutateDeleteFaction(factionId)

  /** @param {{factionId: string, elementId: string, avecComplication: boolean}} params */
  static _handleQueryCreateFactionAtout = async ({ factionId, elementId, avecComplication }) =>
    PenombreReserveCollegiale._mutateCreateFactionAtout(factionId, elementId, avecComplication)

  /** @param {{factionId: string, elementId: string}} params */
  static _handleQueryCreateFactionComplication = async ({ factionId, elementId }) => PenombreReserveCollegiale._mutateCreateFactionComplication(factionId, elementId)

  /** @param {{factionId: string, elementId: string, elementType: string}} params */
  static _handleQueryDeleteFactionElement = async ({ factionId, elementId, elementType }) =>
    PenombreReserveCollegiale._mutateDeleteFactionElement(factionId, elementId, elementType)

  /** @param {{factionId: string, elementId: string, elementType: string, valeur: number}} params */
  static _handleQueryUpdateFactionElementValeur = async ({ factionId, elementId, elementType, valeur }) =>
    PenombreReserveCollegiale._mutateChangeFactionElementValeur(factionId, elementId, elementType, valeur)

  /** @param {{factionId: string, elementId: string, elementType: string, nom: string}} params */
  static _handleQueryUpdateFactionElementNom = async ({ factionId, elementId, elementType, nom }) =>
    PenombreReserveCollegiale._mutateUpdateFactionElementNom(factionId, elementId, elementType, nom)

  /** @param {{factionId: string, nom: string}} params */
  static _handleQueryUpdateFactionName = async ({ factionId, nom }) => PenombreReserveCollegiale._mutateUpdateFactionNom(factionId, nom)

  /** @param {{factionId: string, niveau: number, nom: string}} params */
  static _handleQueryAddFactionComplicationFromRoll = async ({ factionId, niveau, nom }) => PenombreReserveCollegiale._mutateAddFactionComplicationFromRoll(factionId, niveau, nom)

  /** @param {{factionId: string, elementId: string}} params */
  static _handleQueryDecrementFactionAtout = async ({ factionId, elementId }) => PenombreReserveCollegiale._mutateDecrementFactionAtout(factionId, elementId)

  // #endregion Query handlers
}
