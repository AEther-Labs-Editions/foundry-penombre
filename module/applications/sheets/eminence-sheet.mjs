const { sheets } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api

import { systemPath } from "../../config/system.mjs"

export default class EminenceSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /**
   * Different sheet modes.
   * @enum {number}
   */
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["penombre", "eminence"],
    position: {
      width: 1150,
      height: 780,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      contentClasses: ["eminence-content"],
      resizable: true,
    },
    actions: {
      editImage: EminenceSheet.#onEditImage,
      clicJeton: EminenceSheet.#onClicJeton,
    },
  }

  /**
   * The current sheet mode.
   * @type {number}
   */
  _sheetMode = this.constructor.SHEET_MODES.PLAY

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/eminence/eminence.hbs",
      templates: ["atouts.hbs", "conscience.hbs", "harmoniques.hbs", "maitrises.hbs", "personnage.hbs", "pouvoirs.hbs", "timbre.hbs"].map((t) =>
        systemPath(`templates/eminence/partials/${t}`),
      ),
    },
  }

  /**
   * Is the sheet currently in 'Play' mode?
   * @type {boolean}
   */
  get isPlayMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.PLAY
  }

  /**
   * Is the sheet currently in 'Edit' mode?
   * @type {boolean}
   */
  get isEditMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.EDIT
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.systemSource = this.document.system._source
    context.document = this.document
    context.system = this.document.system

    context.ame = this.document.system._source.harmoniques.ame.valeur
    context.esprit = this.document.system._source.harmoniques.esprit.valeur
    context.etincelle = this.document.system._source.harmoniques.etincelle.valeur
    context.nature = this.document.system._source.harmoniques.nature.valeur
    context.nuit = this.document.system._source.harmoniques.nuit.valeur

    context.conscience = this.document.system.conscience.valeur
    context.consciencemax = this.document.system.conscience.max

    context.unlocked = this.isEditMode
    context.locked = this.isPlayMode

    context.styleJeu = game.settings.get("penombre", "styleJeu")

    console.log("EminenceSheet._prepareContext", context)
    return context
  }


  /* -------------------------------------------- */


  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    // Set toggle state and add status class to frame
    this._renderModeToggle(this.element)
  }

  /**
   * Manage the lock/unlock button on the sheet
   * @param {Event} event
   */
  async _onSheetChangeLock(event) {
    event.preventDefault()
    const modes = this.constructor.SHEET_MODES
    this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT
    await this.submit()
    this.render()
  }

  /**
   * Handle re-rendering the mode toggle on ownership changes.
   * @param {HTMLElement} element
   * @protected
   */
  _renderModeToggle(element) {
    const header = element.querySelector(".window-header")
    const toggle = header.querySelector(".mode-slider")
    if (this.isEditable && !toggle) {
      const toggle = document.createElement("penombre-toggle-switch")
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT
      toggle.classList.add("mode-slider")
      // TODO change tooltip with translation
      toggle.dataset.tooltip = "PENOMBRE.ui.modeEdition"
      toggle.dataset.tooltipDirection = "UP"
      toggle.setAttribute("aria-label", game.i18n.localize("PENOMBRE.ui.modeEdition"))
      toggle.addEventListener("change", this._onSheetChangeLock.bind(this))
      toggle.addEventListener("dblclick", (event) => event.stopPropagation())
      toggle.addEventListener("pointerdown", (event) => event.stopPropagation())
      header.prepend(toggle)
    } else if (this.isEditable) {
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT
    } else if (!this.isEditable && toggle) {
      toggle.remove()
    }
  }

  /**
   * Handle changing a Document's image.
   *
   * @this EminenceSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @private
   */
  static async #onEditImage(event, target) {
    const current = foundry.utils.getProperty(this.document, "img")
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {}
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ img: path })
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return fp.browse()
  }

  /**
   * Handle clicking on Document's elements.
  **/
  static async #onClicJeton(event, target) {

    console.log("Je suis dans #onClicJeton()");

    const element = target;                                     // On récupère le clic
    const whatIsIt = element.dataset.libelId;                   // Va récupérer 'conscience-1-on' ou 'conscience-1-off' par exemple
    const whatIsItTab = whatIsIt.split('-');
    const which = whatIsItTab[1];                               // Va récupérer '1' ou '2'…
    const how = whatIsItTab[2];                                 // Va récupérer 'on' ou bien 'off'

    let myActor = this.actor;
    console.log ("myActor = ", myActor);
    let myTabJetonsConscience = myActor.system.conscience.jetons;
    console.log ("myTabJetonsConscience = ", myTabJetonsConscience);

    console.log("whatIsIt = ", whatIsIt);

    /*

    switch (how) {
      case "on": 
      switch (which) {
        case "1":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "2":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "3":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "4":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "5":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "6":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "7":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "8":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "9":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "10":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "11":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "12":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "13":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "14":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "15":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "16":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "17":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "18":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "19":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "20":
          myActor.update({ "system.counscience.jauge10": false });
          break;
      };
      break;
      case "off":
        switch (which) {
        case "1":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "2":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "3":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "4":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "5":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "6":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "7":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "8":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "9":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "10":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "11":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "12":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "13":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "14":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "15":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "16":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "17":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "18":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "19":
          myActor.update({ "system.counscience.jauge10": false });
          break;
        case "20":
          myActor.update({ "system.counscience.jauge10": false });
          break;
      };
      break;
    }

    */
  }


}