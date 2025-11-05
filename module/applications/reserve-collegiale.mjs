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
    },
    dragDrop: [{
      dragSelector: '[data-drag]',
      dropSelector: null,
    }],
  }


  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop[]}     An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      // return new DragDrop(d);
      return new foundry.applications.ux.DragDrop.implementation(d);
    });
  }

  #dragDrop;

  // Optional: Add getter to access the private property

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(context, options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
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

    return {
      userId: game.user.id,
      isGM: game.user.isGM,
      jetons: await game.settings.get(SYSTEM.ID, "reserveCollegiale").jetons,

      isStyleJeuStandard: styleJeu === "standard",
      isStyleJeuAvance: styleJeu === "avance",
    }
  }



  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }


  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }


  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    console.log('_onDragStart()')
    const target = event.currentTarget
    let dragData

    if (target.classList.contains("reserveCollegialeDnD")) {
      const type = "penombre.reserveCollegialeDnD"
      dragData = {
        type,
      }
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
    }
    // Sinon dataset contient autre chose
    // else super._onDragStart(event)
  }


  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}


  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    // Handle different data types
    switch (data.type) {
        // write your cases
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
}
