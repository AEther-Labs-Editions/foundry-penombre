const { sheets } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api
import { SYSTEM, systemPath } from "../../config/system.mjs"

export default class AdversaireSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /**
   * Different sheet modes.
   * @enum {number}
   */
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["penombre", "adversaire"],
    position: {
      width: 575,
      height: 780,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      contentClasses: ["adversaire-content"],
      resizable: true,
    },
    actions: {
      editImage: AdversaireSheet.#onEditImage,
      create: AdversaireSheet.#onCreateItem,
      edit: AdversaireSheet.#onEditItem,
      read: AdversaireSheet.#onReadItem,
      delete: AdversaireSheet.#onDeleteItem,
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
      template: "systems/penombre/templates/adversaire/adversaire.hbs",
      templates: ["actions.hbs", "intrigues.hbs", "personnage.hbs"].map((t) =>
        systemPath(`templates/adversaire/partials/${t}`),
      ),
      scrollable: [""],
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

    context.actions = this.document.itemTypes.action
    context.intrigues = this.document.itemTypes.intrigue

    context.unlocked = this.isEditMode
    context.locked = this.isPlayMode

    context.harmoniquesChoices = this.document.system.dissonance.harmonique.choices

    console.log("AdversaireSheet._prepareContext", context)
    return context
  }

  /**
   * Actions performed after a first render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options)
  }


  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    // Set toggle state and add status class to frame
    this._renderModeToggle(this.element)

    // foo("system.adversite.valeur", this.adversite.valeur, 0, system.adversite.max, 1)
    // foo("system.resilience.valeur", this.resilience.valeur, 0, system.adversite.max * 3, 1)
    // foo("system.dissonance.valeur", this.resilience.valeur, 0, system.dissonance.max * 3, 1)

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
   * @this AdversaireSheet
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

  static async #onCreateItem(event, target) {
    event.preventDefault()
    const type = target.dataset.type

    const itemData = {
      type: type,
    }
    if (type === "description") {
      itemData.name = game.i18n.localize("PENOMBRE.ui.descriptionNew")
    } else if (type === "action") {
      itemData.name = game.i18n.localize("PENOMBRE.ui.actionNew")
    } else if (type === "intrigue") {
      itemData.name = game.i18n.localize("PENOMBRE.ui.intrigueNew")
    }
    return await this.actor.createEmbeddedDocuments("Item", [itemData])
  }

  static #onEditItem(event, target) {
    event.preventDefault()
    const id = target.dataset.itemId
    if (id) {
      const item = this.actor.items.get(id)
      if (item) return item.sheet.render({ force: true })
    }
  }

  static #onReadItem(event, target) {
    event.preventDefault()
    const id = target.dataset.itemId
    if (id) {
      const item = this.actor.items.get(id)
      if (item) return item.sheet.render({ force: true })
    }
    console.log("this.actor = ", this.actor)
  }

  static async #onDeleteItem(event, target) {
    event.preventDefault()
    const id = target.dataset.itemId
    if (id) return await this.actor.deleteEmbeddedDocuments("Item", [id])
  }
}

/*
function foo (name, value, min, max, step) {
  console.log("foo", name, value, min, max, step)
  if (name) {
    // Here you process the template and put it in the DOM
    var template = $(`range-picker[name="`+name+`"]`).parent().html();
    console.log("foo template = ", template)
    var templateScript = Handlebars.compile(template);
    let result = '';
    // {{rangePicker name="foo" value=bar min=0 max=10 step=1}}
    result += `<range-picker name="`+name+`"`+` value="`+value+`" min="`+min+`" max="`+max+`" step="`+step+`">`+
    `<input type="range" min="`+min+`" max="`+max+`" step="`+step+`">`+
    `<input type="number" min="`+min+`" max="`+max+`" step="`+step+`></range-picker>`
    console.log("foo result = ", result)
    var html = templateScript(result);
    // Once you have inserted your code in the DOM you can now use jQuery to modify it
    $(`range-picker[name="`+name+`"]`).parent().html($(`range-picker[name="`+name+`"]`).parent().html(html))
  }
}
*/