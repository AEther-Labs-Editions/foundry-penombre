const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api

/**
 * Une application pour afficher une vue d'ensemble des joueurs et de leurs éminences grises.
 * Accessible uniquement au MJ.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class PenombreGroupManager extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: "penombre-group-manager",
    window: {
      contentClasses: ["penombre-group-manager-content"],
      title: "PENOMBRE.GroupManager.title",
      resizable: true,
    },
    position: {
      width: 900,
    },
    actions: {
      openSheet: PenombreGroupManager.#onOpenSheet,
    },
  }

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/group-manager.hbs",
    },
  }

  /** @type {number|null} */
  #hookUpdateActor = null

  /** @type {number|null} */
  #hookRenderPlayers = null

  /** @inheritDoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options)
    this.#hookUpdateActor = Hooks.on("updateActor", () => this.render())
    this.#hookRenderPlayers = Hooks.on("renderPlayers", () => this.render())
  }

  /** @inheritDoc */
  _onClose(options) {
    if (this.#hookUpdateActor !== null) Hooks.off("updateActor", this.#hookUpdateActor)
    if (this.#hookRenderPlayers !== null) Hooks.off("renderPlayers", this.#hookRenderPlayers)
    this.#hookUpdateActor = null
    this.#hookRenderPlayers = null
    super._onClose(options)
  }

  /** @override */
  async _prepareContext(_options = {}) {
    const members = game.users
      .filter((u) => !u.isGM && u.active && u.character?.type === "eminence")
      .map((u) => {
        const actor = u.character
        const system = actor.system
        const harmoniques = {}
        for (const key of ["ame", "esprit", "etincelle", "nature", "nuit"]) {
          harmoniques[key] = { valeur: system._source.harmoniques[key].valeur }
        }
        const jetons = system.conscience.jetons.slice(0, system.conscience.max)
        return {
          userName: u.name,
          userColor: u.color,
          actorId: actor.id,
          name: actor.name,
          img: actor.img,
          harmoniques,
          conscience: {
            valeur: system.conscience.valeur,
            max: system.conscience.max,
            jetons,
          },
          nbJetonsRestants: system.nbJetonsRestants,
        }
      })

    return { members }
  }

  /**
   * Ouvre la fiche d'un acteur.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onOpenSheet(event, target) {
    event.preventDefault()
    const actorId = target.dataset.actorId
    const actor = game.actors.get(actorId)
    if (actor) actor.sheet.render(true)
  }
}
