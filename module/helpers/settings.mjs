import { SYSTEM_ID } from "../config/system.mjs"
import ReserveCollegiale from "../models/reserve-collegiale.mjs"

export default class PenombreSettingsHandler {
  /**
   * All settings associated with the system.
   * @type {Record<string, SettingConfig>}
   */
  static get systemSettings() {
    return {
      styleJeu: {
        name: "PENOMBRE.Settings.styleJeu.name",
        hint: "PENOMBRE.Settings.styleJeu.hint",
        scope: "world",
        config: true,
        default: "demo",
        type: String,
        choices: {
          demo: "PENOMBRE.Settings.styleJeu.demo",
          standard: "PENOMBRE.Settings.styleJeu.standard",
          avance: "PENOMBRE.Settings.styleJeu.avance",
        },
        requiresReload: true,
      },

      nbJetons: {
        name: "PENOMBRE.Settings.nbJetons.name",
        hint: "PENOMBRE.Settings.nbJetons.hint",
        scope: "world",
        config: true,
        type: new foundry.data.fields.NumberField({ required: true, nullable: false, integer: true, min: 1, initial: 10 }),
        requiresReload: true,
      },

      utiliserFactions: {
        name: "PENOMBRE.Settings.utiliserFactions.name",
        hint: "PENOMBRE.Settings.utiliserFactions.hint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        requiresReload: true,
      },

      // Choix de chaque joueur, quel que soit le style de jeu ; la fiche se met à jour sans rechargement
      afficherRecapitulatif: {
        name: "PENOMBRE.Settings.afficherRecapitulatif.name",
        hint: "PENOMBRE.Settings.afficherRecapitulatif.hint",
        scope: "user",
        config: true,
        default: true,
        type: Boolean,
        onChange: () => {
          for (const actor of game.actors.filter((a) => a.type === "eminence")) {
            if (actor.sheet?.rendered) actor.sheet.render()
          }
        },
      },

      desSpeciaux: {
        name: "PENOMBRE.Settings.desSpeciaux.name",
        hint: "PENOMBRE.Settings.desSpeciaux.hint",
        scope: "client",
        config: true,
        default: true,
        type: Boolean,
        requiresReload: true,
      },

      desSpeciauxTexture: {
        name: "PENOMBRE.Settings.desSpeciauxTexture.name",
        hint: "PENOMBRE.Settings.desSpeciauxTexture.hint",
        scope: "client",
        config: true,
        default: true,
        type: Boolean,
        requiresReload: true,
      },

      reserveCollegiale: {
        name: "PENOMBRE.Settings.reserveCollegiale.name",
        hint: "PENOMBRE.Settings.reserveCollegiale.hint",
        scope: "world",
        config: false,
        type: ReserveCollegiale,
        default: {
          jetons: {
            1: { valeur: false },
            2: { valeur: false },
            3: { valeur: false },
            4: { valeur: false },
            5: { valeur: false },
            6: { valeur: false },
            7: { valeur: false },
            8: { valeur: false },
            9: { valeur: false },
            10: { valeur: false },
          },
          potentiel: 0,
          factions: {},
        },
      },

      worldKey: {
        name: "Unique world key",
        scope: "world",
        config: false,
        type: String,
        default: "",
      },
    }
  }

  /**
   * Helper function called in the `init` hook.
   */
  static registerSettings() {
    for (const [key, value] of Object.entries(this.systemSettings)) {
      game.settings.register(SYSTEM_ID, key, value)
    }
  }
}
