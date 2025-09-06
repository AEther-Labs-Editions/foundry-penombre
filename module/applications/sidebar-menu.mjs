const { HandlebarsApplicationMixin } = foundry.applications.api
const { AbstractSidebarTab } = foundry.applications.sidebar

export default class PenombreSidebarMenu extends HandlebarsApplicationMixin(AbstractSidebarTab) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    window: {
      title: "PENOMBRE.Sidebar.title",
    },
    actions: {
      openApp: PenombreSidebarMenu.#onOpenApp,
    },
  }

  /** @override */
  static tabName = "penombre"

  /** @override */
  static PARTS = {
    penombre: {
      template: "systems/penombre/templates/sidebar-menu.hbs",
      root: true, // Permet d'avoir plusieurs sections dans le hbs
    },
  }

  static async #onOpenApp(event) {
    switch (event.target.dataset.app) {
      case "reserve":
        if (!foundry.applications.instances.has("penombre-reserve-collegiale")) game.system.applicationReserveCollegiale.render({ force: true })
        break
      default:
        break
    }
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    return Object.assign(context, {
      version: `Version ${game.system.version}`,
    })
  }
}
