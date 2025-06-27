const { HandlebarsApplicationMixin } = foundry.applications.api

import { systemPath } from "../../config/system.mjs"

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
    main: { template: "systems/penombre/templates/eminence/eminence.hbs" ,
      templates: ["atouts.hbs", "conscience.hbs", "harmoniques.hbs","maitrises.hbs", "personnage.hbs", "pouvoirs.hbs", "timbre.hbs"].map(t => systemPath(`templates/eminence/partials/${t}`)),
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.document = this.document
    context.system = this.document.system
    context.systemSource = this.document.system._source

    context.ame = this.document.system._source.harmoniques.ame.valeur
    context.esprit = this.document.system._source.harmoniques.esprit.valeur
    context.etincelle = this.document.system._source.harmoniques.etincelle.valeur
    context.nature = this.document.system._source.harmoniques.nature.valeur
    context.nuit = this.document.system._source.harmoniques.nuit.valeur

    return context
  }
}
