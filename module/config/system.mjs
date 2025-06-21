import * as EMINENCE from "./eminence.mjs"

export const SYSTEM_ID = "penombre"
export const DEV_MODE = true

export const HARMONIQUES_VALUES = Object.freeze({
  D4: "d4",
  D6: "d6",
  D8: "d8",
  D10: "d10",
  D12: "d12",
})

/**
 * Include all constant definitions within the SYSTEM global export
 * @type {Object}
 */
export const SYSTEM = {
  id: SYSTEM_ID,
  DEV_MODE,
  HARMONIQUES: EMINENCE.HARMONIQUES,
  PEUPLES: EMINENCE.PEUPLES,
  GAMMES: EMINENCE.GAMMES,
  TONS: EMINENCE.TONS,
  HARMONIQUES_VALUES,
}
