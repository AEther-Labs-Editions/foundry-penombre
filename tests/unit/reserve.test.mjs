import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { ajusterTaille, nbJetonsDisponibles, payer } from "../../module/regles/reserve.mjs"

// "1" : jeton disponible, "0" : jeton pris
const jetons = (code) => Object.fromEntries([...code].map((c, i) => [String(i + 1), { valeur: c === "1" }]))
const code = (objet) =>
  Object.keys(objet)
    .sort((a, b) => Number(a) - Number(b))
    .map((cle) => (objet[cle].valeur ? "1" : "0"))
    .join("")

describe("paiement", () => {
  test("prend les premiers jetons disponibles", () => {
    const r = payer(jetons("01110"), 2)
    assert.equal(r.paye, true)
    assert.equal(r.restants, 3)
    assert.equal(code(r.jetons), "00010")
  })

  test("tout ou rien : rien n'est pris s'il n'en reste pas assez", () => {
    const avant = jetons("10100")
    const r = payer(avant, 3)
    assert.equal(r.paye, false)
    assert.equal(r.restants, 2)
    assert.equal(code(r.jetons), "10100")
    assert.equal(code(avant), "10100")
  })

  test("deux paiements successifs, comme deux joueuses à la suite dans la file d'attente", () => {
    const premier = payer(jetons("11100"), 2)
    const second = payer(premier.jetons, 2)
    assert.equal(second.paye, false)
    assert.equal(nbJetonsDisponibles(second.jetons), 1)
  })
})

describe("taille de la réserve", () => {
  test("agrandie : les nouveaux jetons ne sont pas disponibles", () => {
    assert.equal(code(ajusterTaille(jetons("11"), 4)), "1100")
  })

  test("réduite : les jetons au-delà sont supprimés", () => {
    const r = ajusterTaille(jetons("110011"), 3)
    assert.deepEqual(Object.keys(r), ["1", "2", "3"])
    assert.equal(code(r), "110")
  })

  test("plus de 10 jetons", () => {
    assert.equal(Object.keys(ajusterTaille(jetons("1"), 15)).length, 15)
  })
})
