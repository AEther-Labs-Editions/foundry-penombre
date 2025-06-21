const { HandlebarsApplicationMixin } = foundry.applications.api

export default class EminenceSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["eminence"],
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
  }

  /** @override */
  static PARTS = {
    main: { template: "systems/penombre/templates/eminence-main.hbs" },
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
