const { HandlebarsApplicationMixin } = foundry.applications.api

export default class AtoutSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["atout"],
    position: {
      width: 500,
      height: 200,
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
    main: { template: "systems/penombre/templates/atout-main.hbs" },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.systemSource = this.document.system._source
    context.document = this.document
    context.system = this.document.system

    context.item = this.document

    return context
  }
}
