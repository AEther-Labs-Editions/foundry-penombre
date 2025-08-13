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
      width: 580,
      height: 620,
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
    const styleJeu = await game.settings.get("penombre", "styleJeu")

    return {
      userId: game.user.id,
      isGM: game.user.isGM,
      jetons: await game.settings.get(SYSTEM.ID, "reserveCollegiale").jetons,

      isStyleJeuStandard: styleJeu === "standard",
      isStyleJeuAvance: styleJeu === "avance",
    }
  }

  /**
   * Handle clicking on Document's elements.
   * @param {Event} event The click event triggered by the user.
   * @param {HTMLElement} target The HTML element that was clicked, containing dataset information.
   * @returns {Promise<void>}
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

  /**
   * Updates the "reserveCollegiale" setting by setting a specified number of jetons' "valeur" property from true to false.
   *
   * @async
   * @param {Object} params  The parameters object.
   * @param {number} params.index The index of the jeton to update.
   * @returns {Promise<void>} Resolves when the reserveCollegiale setting has been updated.
   */
  static _handleQueryUpdateReserveCollegiale = async ({ index }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))
    reserveCollegiale.jetons[index].valeur = !reserveCollegiale.jetons[index].valeur
    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }

  /**
   * Updates the "reserveCollegiale" setting by setting a specified number of jetons' "valeur" property from true to false.
   *
   * @async
   * @param {Object} params  The parameters object.
   * @param {number} params.nbJetons The number of jetons to update from true to false.
   * @returns {Promise<void>} Resolves when the reserveCollegiale setting has been updated.
   */
  static _handleQueryUpdateReserveCollegialeFromRoll = async ({ nbJetons }) => {
    const reserveCollegiale = foundry.utils.duplicate(game.settings.get(SYSTEM.ID, "reserveCollegiale"))

    // Parcours de l'objet pour mettre à jour nbJetons
    let nbJetonsModifies = 0
    for (const [index, jeton] of Object.entries(reserveCollegiale.jetons)) {
      if (jeton.valeur === true && nbJetonsModifies < nbJetons) {
        reserveCollegiale.jetons[index].valeur = false
        nbJetonsModifies++
      }
    }

    await game.settings.set(SYSTEM.ID, "reserveCollegiale", reserveCollegiale)
  }
}
