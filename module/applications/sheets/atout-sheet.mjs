const { HandlebarsApplicationMixin } = foundry.applications.api

export default class PouvoirSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["penombre", "atout"],
    position: {
      width: 570,
      height: 400,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      contentClasses: ["atout-content"],
      resizable: true,
    },
  }

  /** @override */
  static PARTS = {
    main: { template: "systems/penombre/templates/atout.hbs" },
  }

  /** @override */
  async _prepareContext() {
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
