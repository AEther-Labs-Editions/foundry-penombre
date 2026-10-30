const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api
import { SYSTEM } from "../config/system.mjs"

/**
 * Une application pour gérer la réserve collégiale, le potentiel collégial et les factions.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class PenombreReserveCollegiale extends HandlebarsApplicationMixin(ApplicationV2) {
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /** Hauteur de la fenêtre de la feuille collégiale étendue : panier (555 px) + barre de titre */
  static HAUTEUR_FEUILLE = 593

  _sheetMode = PenombreReserveCollegiale.SHEET_MODES.PLAY

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
      createFaction: PenombreReserveCollegiale.#onCreateFaction,
      deleteFaction: PenombreReserveCollegiale.#onDeleteFaction,
      deleteFactionElement: PenombreReserveCollegiale.#onDeleteFactionElement,
      changeFactionElementValeur: PenombreReserveCollegiale.#onChangeFactionElementValeur,
    },
  }

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options)
    const styleJeu = game.settings.get(SYSTEM.ID, "styleJeu")
    const nbJetons = game.settings.get(SYSTEM.ID, "nbJetons")
    const showFactions = styleJeu !== "demo" && game.settings.get(SYSTEM.ID, "utiliserFactions")
    applicationOptions.window.resizable = showFactions || (styleJeu !== "demo" && nbJetons !== 10)
    if (showFactions) {
      // Feuille collégiale étendue : panier (555 px) et colonne Relations (430 px) bord à bord ; la fenêtre
      // s'ouvre à la hauteur du panier et s'agrandit pour faire défiler moins la colonne Relations
      applicationOptions.classes.push("feuille-etendue")
      applicationOptions.position.width = 987
      applicationOptions.position.height = PenombreReserveCollegiale.HAUTEUR_FEUILLE
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
      factions: Object.entries(reserveCollegiale.factions || {}).map(([id, faction], index) => {
        // Comme sur la feuille du livre, une relation sur deux a ses libellés et ses cubes en rouge
        const rouge = index % 2 === 1
        return {
          id,
          nom: faction.nom,
          rouge,
          // En mode édition, les lignes vides servent à saisir de nouveaux atouts ; en lecture, seuls les éléments définis s'affichent
          atouts: PenombreReserveCollegiale.#emplacements(faction.atouts, unlocked ? 3 : 0, rouge ? "de-case-rouge-" : "de_case_"),
          complication: PenombreReserveCollegiale.#emplacements(faction.complications, unlocked ? 1 : 0, "transp_case_")[0],
        }
      }),
      showFactions: styleJeu !== "demo" && game.settings.get(SYSTEM.ID, "utiliserFactions"),
      useImageDisplay: styleJeu === "demo" || nbJetons === 10,
    }
  }

  /**
   * Complète les atouts (3) ou la complication (1) d'une faction par des emplacements vides, comme les lignes de la feuille collégiale.
   * @param {object} elements Atouts ou complications de la faction, indexés par identifiant
   * @param {number} nbEmplacements Nombre minimal de lignes (0 : aucune ligne vide)
   * @param {string} prefixeImage Début du nom de l'image des cases (cubes blancs, cubes rouges ou cases de complication)
   * @returns {Array<{id: string|null, nom: string, valeur: number, cases: Array<{niveau: number, src: string}>}>}
   */
  static #emplacements(elements, nbEmplacements, prefixeImage) {
    const emplacements = Object.entries(elements || {}).map(([id, element]) => ({ id, nom: element.nom, valeur: element.valeur }))
    while (emplacements.length < nbEmplacements) emplacements.push({ id: null, nom: "", valeur: 0 })
    for (const emplacement of emplacements) {
      emplacement.cases = [1, 2, 3].map((niveau) => ({
        niveau,
        src: `systems/penombre/assets/ui/${prefixeImage}${niveau <= emplacement.valeur ? "checked" : "unchecked"}.webp`,
      }))
    }
    return emplacements
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
   * Crée un atout collégial de niveau 1 pour une faction, sans rien dépenser.
   * Le coût éventuel (points de potentiel collégial, case de complication pour obtenir le niveau 2) est reporté
   * à la main par le MJ sur le médaillon Potentiel, les cubes et les cases de la feuille.
   * @param {string} factionId
   * @param {string} elementId
   * @param {string} [nom]
   */
  static async _mutateCreateFactionAtout(factionId, elementId, nom) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const faction = r.factions[factionId]
      if (!faction) return
      if (Object.keys(faction.atouts || {}).length >= 3) return
      if (!faction.atouts) faction.atouts = {}
      faction.atouts[elementId] = {
        nom: nom || game.i18n.localize("PENOMBRE.Factions.nouvelAtout"),
        valeur: 1,
      }
    })
  }

  /**
   * Crée une complication collégiale pour une faction (création manuelle, hors jet), avec une case barrée.
   * @param {string} factionId
   * @param {string} elementId
   * @param {string} [nom]
   */
  static async _mutateCreateFactionComplication(factionId, elementId, nom) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const faction = r.factions[factionId]
      if (!faction) return
      if (Object.keys(faction.complications || {}).length >= 1) return
      if (!faction.complications) faction.complications = {}
      faction.complications[elementId] = {
        nom: nom || game.i18n.localize("PENOMBRE.Factions.nouvelleComplication"),
        valeur: 1,
      }
    })
  }

  /**
   * Supprime un atout ou une complication de faction.
   * Un atout perdu pour des raisons narratives peut rendre ses points au potentiel collégial (`rembourser`).
   * @param {string} factionId
   * @param {string} elementId
   * @param {"atout"|"complication"} elementType
   * @param {boolean} [rembourser]
   */
  static async _mutateDeleteFactionElement(factionId, elementId, elementType, rembourser = false) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const collection = elementType === "atout" ? "atouts" : "complications"
      const element = r.factions[factionId]?.[collection]?.[elementId]
      if (!element) return
      if (elementType === "atout" && rembourser) r.potentiel += element.valeur
      delete r.factions[factionId][collection][elementId]
    })
  }

  /**
   * Change le niveau d'un atout ou d'une complication de faction.
   * Cliquer sur la dernière case barrée la décoche. Un atout garde au moins 1 niveau (il se supprime explicitement) ;
   * une complication peut n'avoir plus aucune case barrée : elle reste sur la feuille jusqu'à ce que le MJ la retire,
   * le livre la faisant disparaître lors de la retraite suivante.
   * @param {string} factionId
   * @param {string} elementId
   * @param {"atout"|"complication"} elementType
   * @param {number} valeur Niveau de la case cliquée
   */
  static async _mutateChangeFactionElementValeur(factionId, elementId, elementType, valeur) {
    await PenombreReserveCollegiale._updateReserve((r) => {
      const collection = elementType === "atout" ? "atouts" : "complications"
      const element = r.factions[factionId]?.[collection]?.[elementId]
      if (!element) return

      const minimum = elementType === "atout" ? 1 : 0
      element.valeur = Math.max(element.valeur === valeur ? valeur - 1 : valeur, minimum)
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
   * Fausse note sur un jet ayant utilisé un atout collégial : son niveau baisse de 1.
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
  static async #onDeleteFactionElement(event, target) {
    event.preventDefault()
    const { factionId, elementId, elementType } = target.dataset

    // Un atout perdu pour des raisons narratives peut rendre ses points au potentiel collégial
    let rembourser = false
    if (elementType === "atout") {
      const atout = game.settings.get(SYSTEM.ID, "reserveCollegiale").factions[factionId]?.atouts?.[elementId]
      if (!atout) return
      rembourser = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("PENOMBRE.Factions.supprimerAtout") },
        content: `<p>${game.i18n.format("PENOMBRE.Factions.confirmerSuppressionAtout", { nom: atout.nom })}</p>
          <div class="form-group"><label>
            <input type="checkbox" name="rembourser"/>
            ${game.i18n.format("PENOMBRE.Factions.rembourserPotentiel", { nb: atout.valeur })}
          </label></div>`,
        rejectClose: false,
        buttons: [
          {
            action: "delete",
            label: game.i18n.localize("PENOMBRE.ui.delete"),
            default: true,
            callback: (evt, button) => button.form.elements.rembourser.checked,
          },
        ],
      })
      if (rembourser === null) return
    }

    if (game.user.isGM) await PenombreReserveCollegiale._mutateDeleteFactionElement(factionId, elementId, elementType, rembourser)
    else await game.users.activeGM.query("penombre.deleteFactionElement", { factionId, elementId, elementType, rembourser })

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
   * Création d'un atout saisi sur une ligne vide de la feuille.
   * @param {string} factionId
   * @param {string} nom
   */
  async #creerAtout(factionId, nom) {
    const elementId = foundry.utils.randomID()
    if (game.user.isGM) await PenombreReserveCollegiale._mutateCreateFactionAtout(factionId, elementId, nom)
    else await game.users.activeGM.query("penombre.createFactionAtout", { factionId, elementId, nom })

    this.render({ force: true })
  }

  /**
   * Création d'une complication saisie sur la ligne vide de la feuille.
   * @param {string} factionId
   * @param {string} nom
   */
  async #creerComplication(factionId, nom) {
    const elementId = foundry.utils.randomID()
    if (game.user.isGM) await PenombreReserveCollegiale._mutateCreateFactionComplication(factionId, elementId, nom)
    else await game.users.activeGM.query("penombre.createFactionComplication", { factionId, elementId, nom })

    this.render({ force: true })
  }

  // #endregion Actions déclenchées côté client

  // #region Gestion des événements de rendu

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options)
    this.#renderModeToggle()

    if (context.unlocked) {
      this.element.querySelectorAll(".faction-nom").forEach((input) => input.addEventListener("change", (evt) => this.#onChangeFactionName(evt)))
      this.element.querySelectorAll(".element-nom").forEach((input) => input.addEventListener("change", (evt) => this.#onChangeElementName(evt)))

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

  /**
   * Renomme un atout ou une complication, ou le crée si la ligne était vide.
   * @param {Event} event
   */
  async #onChangeElementName(event) {
    const input = event.target
    const { factionId, elementId, elementType } = input.dataset
    const nom = input.value.trim()
    if (!nom) return

    if (!elementId) {
      if (elementType === "atout") return this.#creerAtout(factionId, nom)
      return this.#creerComplication(factionId, nom)
    }

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

  /** @param {{factionId: string, elementId: string, nom: string}} params */
  static _handleQueryCreateFactionAtout = async ({ factionId, elementId, nom }) => PenombreReserveCollegiale._mutateCreateFactionAtout(factionId, elementId, nom)

  /** @param {{factionId: string, elementId: string, nom: string}} params */
  static _handleQueryCreateFactionComplication = async ({ factionId, elementId, nom }) => PenombreReserveCollegiale._mutateCreateFactionComplication(factionId, elementId, nom)

  /** @param {{factionId: string, elementId: string, elementType: string, rembourser: boolean}} params */
  static _handleQueryDeleteFactionElement = async ({ factionId, elementId, elementType, rembourser }) =>
    PenombreReserveCollegiale._mutateDeleteFactionElement(factionId, elementId, elementType, rembourser)

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
