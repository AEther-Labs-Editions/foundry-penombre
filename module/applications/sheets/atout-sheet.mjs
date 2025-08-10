const { HandlebarsApplicationMixin } = foundry.applications.api

export default class AtoutSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["atout"],
    position: {
      width: 500,
      height: 270,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      contentClasses: ["atout-content"],
      resizable: true,
    },
  }

  /** @typedef {import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart} HandlebarsTemplatePart */
  /** @type {Record<string, HandlebarsTemplatePart>} */
  static PARTS = {
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
      // classes: ['sysclass'], // Optionally add extra classes to the part for extra customization
    },
    datas: {
      template: 'systems/penombre/templates/atout-datas.hbs',
      scrollable: [''],
    },
    descriptions: {
      template: 'systems/penombre/templates/atout-description.hbs',
      scrollable: [''],
    },
  };

  /** @type {Record<string, foundry.applications.types.ApplicationTabsConfiguration>} */
  static TABS = {
    primary: {
      tabs: [{ id: "datas" }, { id: "descriptions" }],
      labelPrefix: "PENOMBRE.tab", // Optional. Prepended to the id to generate a localization key
      initial: "datas", // Set the initial tab
    },
  };

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    /** @type {Record<string, foundry.applications.types.ApplicationTab} */
    context.tabs = this._prepareTabs("primary")

    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.systemSource = this.document.system._source
    context.document = this.document
    context.system = this.document.system

    context.item = this.document

    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description, {
      secrets: this.document.isOwner,
      async: true,
      }
    )


    return context
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'datas':
      case 'descriptions':
        context.tab = context.tabs[partId];
        break;
      default:
    }
    return context;
  }

}
