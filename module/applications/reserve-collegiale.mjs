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
      resizable: true,
      controls: [],
    },
    position: {
      width: 425,
      height: 300,
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

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/reserve-collegiale.hbs",
    },
  }

  /** @override */
  async _prepareContext(_options = {}) {
    return {
      userId: game.user.id,
      isGM: game.user.isGM,
      jetons: await game.settings.get(SYSTEM.ID, "reserveCollegiale").jetons,
    }
  }

  /**
   * Handle clicking on Document's elements.
   * @param event
   * @param target
   **/
  static async #onClicJeton(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const index = dataset.index // Commence à 1

    // Le MJ peut modifier les settings
    if (game.user.isGM) {
      const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
      reserveCollegiale.jetons[index].valeur = !reserveCollegiale.jetons[index].valeur
      await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
    }
    // C'est un joueur : utilisation de la requête
    else {
      await game.users.activeGM.query("penombre.updateReserveCollegiale", { index })
    }

    this.render({ force: true })
  }

  // Gère une requête pour mettre à jour la réserve collégiale
  static _handleQuery = async ({ index }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    reserveCollegiale.jetons[index].valeur = !reserveCollegiale.jetons[index].valeur
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }
}
