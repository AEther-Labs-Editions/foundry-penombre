import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { ajouter, basculer, depenser, indexJetonAPerdre, nbJetonsDisponibles, perdre, regagner, respecteRegle } from "../../module/regles/conscience.mjs"

// "a" : disponible, "i" : dépensé, "p" : perdu
const STATUTS = { a: "actif", i: "inactif", p: "perdu" }
const jetons = (code) => [...code].map((c) => ({ statut: STATUTS[c] }))
const code = (liste) => liste.map((j) => Object.keys(STATUTS).find((k) => STATUTS[k] === j.statut)).join("")

describe("dépense", () => {
  test("les premiers jetons disponibles sont dépensés", () => {
    assert.equal(code(depenser(jetons("iaaap"), 2)), "iiiap")
  })

  test("tout ou rien : null s'il n'en reste pas assez, le tableau reçu n'est pas modifié", () => {
    const avant = jetons("aiip")
    assert.equal(depenser(avant, 2), null)
    assert.equal(code(avant), "aiip")
  })

  test("dépenser 0 jeton ne change rien", () => {
    assert.equal(code(depenser(jetons("aip"), 0)), "aip")
  })
})

describe("envolée", () => {
  test("le premier jeton dépensé redevient disponible", () => {
    assert.equal(code(regagner(jetons("aiip"))), "aaip")
  })

  test("aucun jeton dépensé : null", () => {
    assert.equal(regagner(jetons("aap")), null)
  })
})

describe("clic sur un jeton", () => {
  test("bascule disponible / dépensé", () => {
    assert.equal(code(basculer(jetons("aip"), 0)), "iip")
    assert.equal(code(basculer(jetons("aip"), 1)), "aap")
  })

  test("un jeton perdu ou absent ne bascule pas", () => {
    assert.equal(basculer(jetons("aip"), 2), null)
    assert.equal(basculer(jetons("aip"), 5), null)
  })
})

describe("ajout d'un jeton", () => {
  test("le premier jeton perdu revient, dépensé, et la conscience augmente", () => {
    const r = ajouter(jetons("aipp"), 2, 4)
    assert.equal(code(r.jetons), "aiip")
    assert.equal(r.valeur, 3)
  })

  test("pas au-delà du maximum", () => {
    assert.equal(ajouter(jetons("aapp"), 2, 2), null)
  })
})

describe("perte d'un jeton", () => {
  test("le jeton passe en fin de tableau et la conscience diminue", () => {
    const r = perdre(jetons("aiap"), 3, 0)
    assert.equal(code(r.jetons), "iapp")
    assert.equal(r.valeur, 2)
  })

  test("un jeton déjà perdu ne se perd pas", () => {
    assert.equal(perdre(jetons("aap"), 2, 2), null)
  })

  test("fausse note : un jeton dépensé de préférence, sinon un disponible", () => {
    assert.equal(indexJetonAPerdre(jetons("aaip")), 2)
    assert.equal(indexJetonAPerdre(jetons("aap")), 0)
    assert.equal(indexJetonAPerdre(jetons("ppp")), -1)
  })
})

describe("règle de la conscience", () => {
  test("détecte un tableau incohérent", () => {
    assert.equal(respecteRegle(jetons("aipp"), 2, 4), true)
    assert.equal(respecteRegle(jetons("apip"), 2, 4), false)
    assert.equal(respecteRegle(jetons("aipp"), 3, 4), false)
    assert.equal(respecteRegle(jetons("aaap"), 3, 2), false)
  })

  test("la règle tient après une suite d'opérations", () => {
    const max = 5
    let liste = jetons("aaaaapppp")
    let valeur = 5
    const verifier = (etape) => assert.equal(respecteRegle(liste, valeur, max), true, etape)

    liste = depenser(liste, 2)
    verifier("dépense")
    ;({ jetons: liste, valeur } = perdre(liste, valeur, indexJetonAPerdre(liste)))
    verifier("fausse note")
    liste = regagner(liste)
    verifier("envolée")
    ;({ jetons: liste, valeur } = perdre(liste, valeur, 0))
    verifier("perte d'un jeton disponible")
    ;({ jetons: liste, valeur } = ajouter(liste, valeur, max))
    verifier("ajout")
    liste = basculer(liste, 1)
    verifier("clic")
    assert.equal(valeur, 4)
    assert.equal(nbJetonsDisponibles(liste), 2)
  })
})
