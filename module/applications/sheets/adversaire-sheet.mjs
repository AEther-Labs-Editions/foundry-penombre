const { sheets } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api

export default class AdversaireSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["penombre", "adversaire"],
    position: {
      width: 1152,
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

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/adversaire/adversaire.hbs",
      templates: ["actions-adverses.hbs", "actions-de-dissonance.hbs", "description.hbs", "intrigues.hbs", "personnage.hbs"].map((t) =>
        systemPath(`templates/adversaire/partials/${t}`),
      ),
      scrollable: [""],
    },
  }


  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.systemSource = this.document.system._source
    context.document = this.document
    context.system = this.document.system

    context.description = this.document.itemTypes.description
    context.actionsAdverses = this.document.itemTypes.actionAdverse
    context.actionsDissonance = this.document.itemTypes.actionDissonance
    context.intrigues = this.document.itemTypes.intrigue

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
    } else if (type === "actionAdverse") {
      itemData.name = game.i18n.localize("PENOMBRE.ui.actionAdverseNew")
    } else if (type === "actionDissonance") {
      itemData.name = game.i18n.localize("PENOMBRE.ui.actionDissonanceNew")
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
