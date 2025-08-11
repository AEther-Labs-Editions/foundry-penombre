const { HandlebarsApplicationMixin } = foundry.applications.api

export default class PouvoirSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["penombre", "pouvoir"],
    position: {
      width: 570,
      height: 350,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      contentClasses: ["pouvoir-content"],
      resizable: true,
    },
  }

  /** @override */
  static PARTS = {
    main: { template: "systems/penombre/templates/pouvoir.hbs" },
  }

  /**
   * Is the parent actor sheet of the item currently in 'Edit' mode?
   * @type {boolean}
   */
  get isEditMode() {
    let result = true;
    try {
      result = this.document.parent._sheetMode === this.document.parent.constructor.SHEET_MODES.EDIT
    } catch {console.log("Erreur sur isEditMode !")}
    console.log("isEditMode = ", result)
    return result
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.systemSource = this.document.system._source
    context.document = this.document
    context.item = this.document
    context.system = this.document.system

    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description, { async: true })

    return context
  }
}
