const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api
import { SYSTEM } from "../config/system.mjs"

/**
 * Une application pour gérer la réserve collégiale
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class PenombreReserveCollegiale extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: "penombre-reserve-collegiale",
    tag: "form",
    window: {
      contentClasses: ["penombre-reserve-collegiale-content"],
      title: "PENOMBRE.ReserveCollegiale.title",
      controls: [],
    },
    position: {
      width: 585,
      top: 80,
      left: 150,
    },
    form: {
      closeOnSubmit: true,
    },
    actions: {
      jeton: PenombreReserveCollegiale.#onClicJeton,
    },
  }

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options)
    const styleJeu = game.settings.get(SYSTEM.ID, "styleJeu")
    const nbJetons = game.settings.get(SYSTEM.ID, "nbJetons")
    applicationOptions.window.resizable = styleJeu !== "demo" && nbJetons !== 10
    return applicationOptions
  }

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/reserve-collegiale.hbs",
    },
  }

  /** @override */
  async _prepareContext(_options = {}) {
    const styleJeu = game.settings.get(SYSTEM.ID, "styleJeu")
    const nbJetons = game.settings.get(SYSTEM.ID, "nbJetons")

    return {
      userId: game.user.id,
      isGM: game.user.isGM,
      jetons: game.settings.get(SYSTEM.ID, "reserveCollegiale").jetons,
      useImageDisplay: styleJeu === "demo" || nbJetons === 10,
    }
  }

  /**
   * @param {function(object): void} modifier
   */
  static async _updateReserve(modifier) {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    modifier(reserveCollegiale)
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   **/
  static async #onClicJeton(event, target) {
    event.preventDefault()
    const index = target.dataset.index

    if (game.user.isGM) {
      await PenombreReserveCollegiale._updateReserve((r) => {
        r.jetons[index].valeur = !r.jetons[index].valeur
      })
    } else {
      await game.users.activeGM.query("penombre.updateReserveCollegiale", { index })
    }

    this.render({ force: true })
  }

  /** @param {Object} params */
  static _handleQueryUpdateReserveCollegiale = async ({ index }) => {
    await PenombreReserveCollegiale._updateReserve((r) => {
      r.jetons[index].valeur = !r.jetons[index].valeur
    })
  }

  /** @param {Object} params */
  static _handleQueryUpdateReserveCollegialeFromRoll = async ({ nbJetons }) => {
    await PenombreReserveCollegiale._updateReserve((r) => {
      let nbJetonsModifies = 0
      for (const [index, jeton] of Object.entries(r.jetons)) {
        if (jeton.valeur === true && nbJetonsModifies < nbJetons) {
          r.jetons[index].valeur = false
          nbJetonsModifies++
        }
      }
    })
  }
}
