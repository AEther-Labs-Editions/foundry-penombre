const { HandlebarsApplicationMixin } = foundry.applications.api

export default class PouvoirSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["pouvoir"],
    position: {
      width: 500,
      height: 200,
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
    main: { template: "systems/penombre/templates/pouvoir-main.hbs" },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.document = this.document
    context.system = this.document.system
    context.systemSource = this.document.system._source

    return context
  }
}
