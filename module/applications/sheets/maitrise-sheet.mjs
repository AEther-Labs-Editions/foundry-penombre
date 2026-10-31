import PenombreBaseItemSheet from "./base-item-sheet.mjs"

export default class MaitriseSheet extends PenombreBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["maitrise"],
    position: {
      width: 760, // Deux colonnes pour la description, comme les cartes des tirés à part
      height: 450,
    },

    window: {
      contentClasses: ["maitrise-content"],
    },
  }

  /** @override */
  static PARTS = {
    main: { template: "systems/penombre/templates/maitrise.hbs" },
  }
}
