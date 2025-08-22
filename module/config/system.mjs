import * as EMINENCE from "./eminence.mjs"
import * as ADVERSAIRE from "./adversaire.mjs"
import * as POUVOIR from "./pouvoir.mjs"
import * as ACTION from "./action.mjs"


export const SYSTEM_ID = "penombre"
export const DEV_MODE = true

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
    label: "1 (Par défaut)",
  },
  2: {
    id: "2",
    label: "2 (Difficile)",
  },
  3: {
    id: "3",
    label: "3 (Très difficile)",
  },
  4: {
    id: "4",
    label: "4 (Exceptionnelle)",
  },
  5: {
    id: "5",
    label: "5",
  },
  6: {
    id: "6",
    label: "6 (Phénoménale)",
  },
  7: {
    id: "7",
    label: "7",
  },
  8: {
    id: "8",
    label: "8 (Inouïe)",
  },
  9: {
    id: "9",
    label: "9",
  },
  10: {
    id: "10",
    label: "10 (Surréaliste)",
  },
  11: {
    id: "11",
    label: "11",
  },
  12: {
    id: "12",
    label: "12 (Digne d'une fable)",
  },
  13: {
    id: "13",
    label: "13",
  },
  14: {
    id: "14",
    label: "14",
  },
  15: {
    id: "15",
    label: "15",
  },
  16: {
    id: "16",
    label: "16 (Digne d'un mythe)",
  },
  17: {
    id: "17",
    label: "17",
  },
  18: {
    id: "18",
    label: "18",
  },
  19: {
    id: "19",
    label: "19",
  },
  20: {
    id: "20",
    label: "20 (Digne d'une muse)",
  },
})

/**
 * Include all constant definitions within the SYSTEM global export
 * @type {Object}
 */
export const SYSTEM = {
  ID: SYSTEM_ID,
  DEV_MODE,
  HARMONIQUES: EMINENCE.HARMONIQUES,
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
  HARMONIQUES_2: ADVERSAIRE.HARMONIQUES_2,

}

/**
 * Translates repository paths to Foundry Data paths
 * @param {string} path A path relative to the root of this repository
 * @returns {string} The path relative to the Foundry data folder
 */
export const systemPath = (path) => `systems/${SYSTEM_ID}/${path}`
