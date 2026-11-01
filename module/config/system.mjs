import * as EMINENCE from "./eminence.mjs"
import * as POUVOIR from "./pouvoir.mjs"
import * as ACTION from "./action.mjs"

export const SYSTEM_ID = "penombre"

export const HARMONIQUE_VALEURS = Object.freeze({
  D4: "d4",
  D6: "d6",
  D8: "d8",
  D10: "d10",
  D12: "d12",
})

export const JETON_STATUTS = Object.freeze({
  actif: {
    id: "actif",
    label: "PENOMBRE.Jeton.actif.label",
  },
  inactif: {
    id: "inactif",
    label: "PENOMBRE.Jeton.inactif.label",
  },
  perdu: {
    id: "perdu",
    label: "PENOMBRE.Jeton.perdu.label",
  },
})

export const POTENTIEL_MAX = 20

export const DIFFICULTE = Object.freeze({
  1: {
    id: "1",
    label: "PENOMBRE.Difficulte.1",
  },
  2: {
    id: "2",
    label: "PENOMBRE.Difficulte.2",
  },
  3: {
    id: "3",
    label: "PENOMBRE.Difficulte.3",
  },
  4: {
    id: "4",
    label: "PENOMBRE.Difficulte.4",
  },
  5: {
    id: "5",
    label: "PENOMBRE.Difficulte.5",
  },
  6: {
    id: "6",
    label: "PENOMBRE.Difficulte.6",
  },
  7: {
    id: "7",
    label: "PENOMBRE.Difficulte.7",
  },
  8: {
    id: "8",
    label: "PENOMBRE.Difficulte.8",
  },
  9: {
    id: "9",
    label: "PENOMBRE.Difficulte.9",
  },
  10: {
    id: "10",
    label: "PENOMBRE.Difficulte.10",
  },
  11: {
    id: "11",
    label: "PENOMBRE.Difficulte.11",
  },
  12: {
    id: "12",
    label: "PENOMBRE.Difficulte.12",
  },
  13: {
    id: "13",
    label: "PENOMBRE.Difficulte.13",
  },
  14: {
    id: "14",
    label: "PENOMBRE.Difficulte.14",
  },
  15: {
    id: "15",
    label: "PENOMBRE.Difficulte.15",
  },
  16: {
    id: "16",
    label: "PENOMBRE.Difficulte.16",
  },
  17: {
    id: "17",
    label: "PENOMBRE.Difficulte.17",
  },
  18: {
    id: "18",
    label: "PENOMBRE.Difficulte.18",
  },
  19: {
    id: "19",
    label: "PENOMBRE.Difficulte.19",
  },
  20: {
    id: "20",
    label: "PENOMBRE.Difficulte.20",
  },
})

// Modes de message de Foundry V14 (CONFIG.ChatMessage.modes), enregistrés dans roll.options.rollMode
export const DICE_ROLL_MODES = Object.freeze({
  /**
   * This roll is visible to all players.
   */
  PUBLIC: "public",

  /**
   * Rolls of this type are only visible to the player that rolled and any Game Master users.
   */
  PRIVATE: "gm",

  /**
   * A private dice roll only visible to Gamemaster users. The rolling player will not see the result of their own roll.
   */
  BLIND: "blind",

  /**
   * A private dice roll which is only visible to the user who rolled it.
   */
  SELF: "self",
})

/**
 * Include all constant definitions within the SYSTEM global export
 * @type {Object}
 */
export const SYSTEM = {
  ID: SYSTEM_ID,
  HARMONIQUES: EMINENCE.HARMONIQUES,
  HARMONIQUES_FICHE: EMINENCE.HARMONIQUES_FICHE,
  PEUPLES: EMINENCE.PEUPLES,
  GAMMES: EMINENCE.GAMMES,
  TONS: EMINENCE.TONS,
  TIMBRES: EMINENCE.TIMBRES,
  HARMONIQUE_VALEURS: HARMONIQUE_VALEURS,
  POUVOIR_TYPES: POUVOIR.POUVOIR_TYPES,
  JETON_STATUTS,
  POTENTIEL_MAX,
  DIFFICULTE,
  ACTION_TYPES: ACTION.ACTION_TYPES,
  DICE_ROLL_MODES,
}

/**
 * Translates repository paths to Foundry Data paths
 * @param {string} path A path relative to the root of this repository
 * @returns {string} The path relative to the Foundry data folder
 */
export const systemPath = (path) => `systems/${SYSTEM_ID}/${path}`
