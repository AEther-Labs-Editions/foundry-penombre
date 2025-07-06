import * as EMINENCE from "./eminence.mjs"
import * as POUVOIR from "./pouvoir.mjs"

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
}

/**
 * Translates repository paths to Foundry Data paths
 * @param {string} path A path relative to the root of this repository
 * @returns {string} The path relative to the Foundry data folder
 */
export const systemPath = (path) => `systems/${SYSTEM_ID}/${path}`
