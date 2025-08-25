const { HandlebarsApplicationMixin } = foundry.applications.api

export default class IntrigueSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["penombre", "intrigue"],
    position: {
      width: 570,
      height: 400,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      contentClasses: ["intrigue-content"],
      resizable: true,
    },
  }

  /** @override */
  static PARTS = {
    main: { template: "systems/penombre/templates/intrigue.hbs" },
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
