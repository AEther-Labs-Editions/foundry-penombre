import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { analyserDes, calculerCoutJetons, jetonsARepartir, verifierRepartition } from "../../module/regles/jets.mjs"

describe("calculerCoutJetons", () => {
  test("jet simple sans option : rien à payer", () => {
    const cout = calculerCoutJetons()
    assert.equal(cout.total, 0)
    assert.equal(cout.premierAtoutGratuit, true)
  })

  test("jet simple : le premier atout est gratuit", () => {
    assert.equal(calculerCoutJetons({ nbAtouts: 1 }).total, 0)
    assert.equal(calculerCoutJetons({ nbAtouts: 3 }).total, 2)
  })

  test("action collégiale principale : 1 jeton, et premier atout payant sans la case", () => {
    const cout = calculerCoutJetons({ actionCollegiale: true, nbAtouts: 2 })
    assert.equal(cout.premierAtoutGratuit, false)
    assert.equal(cout.jetonActionCollegiale, 1)
    assert.equal(cout.jetonsAtouts, 2)
    assert.equal(cout.total, 3)
  })

  test("action collégiale principale avec la case Premier atout : premier atout gratuit", () => {
    const cout = calculerCoutJetons({ actionCollegiale: true, premierAtoutCoche: true, nbAtouts: 2 })
    assert.equal(cout.premierAtoutGratuit, true)
    assert.equal(cout.total, 2)
  })

  test("jet lié : pas de jeton d'action collégiale, premier atout gratuit seulement avec la case", () => {
    const sansCase = calculerCoutJetons({ messageLie: true, actionCollegialeLiee: true, nbAtouts: 1 })
    assert.equal(sansCase.jetonActionCollegiale, 0)
    assert.equal(sansCase.premierAtoutGratuit, false)
    assert.equal(sansCase.total, 1)
    const avecCase = calculerCoutJetons({ messageLie: true, actionCollegialeLiee: true, premierAtoutCoche: true, nbAtouts: 1 })
    assert.equal(avecCase.premierAtoutGratuit, true)
    assert.equal(avecCase.total, 0)
  })

  test("dé merveilleux et effet magique : 1 jeton chacun", () => {
    assert.equal(calculerCoutJetons({ deMerveilleux: true }).total, 1)
    assert.equal(calculerCoutJetons({ effetMagique: true, niveauEffetMagique: 1, niveauMaitrise: 1 }).total, 1)
  })

  test("effet magique : 1 jeton par niveau manquant de maîtrise", () => {
    const cout = calculerCoutJetons({ effetMagique: true, niveauEffetMagique: 4, niveauMaitrise: 1 })
    assert.equal(cout.jetonsEffetMagiqueMaitrise, 3)
    assert.equal(cout.total, 4)
    // Une maîtrise de niveau supérieur ne rend pas de jeton
    assert.equal(calculerCoutJetons({ effetMagique: true, niveauEffetMagique: 2, niveauMaitrise: 5 }).total, 1)
  })

  test("niveau d'effet sans effet magique : aucun coût", () => {
    assert.equal(calculerCoutJetons({ effetMagique: false, niveauEffetMagique: 5 }).total, 0)
  })

  test("atouts de faction : un jeton de réserve chacun, le premier gratuit va à un atout personnel", () => {
    // Un atout personnel et un atout de faction : l'atout personnel est gratuit, le jeton de faction vient de la réserve
    assert.equal(calculerCoutJetons({ nbAtouts: 2, nbFactionAtouts: 1 }).jetonsReserveMinimum, 1)
    // Seulement des atouts de faction : le premier est gratuit
    assert.equal(calculerCoutJetons({ nbAtouts: 2, nbFactionAtouts: 2 }).jetonsReserveMinimum, 1)
    // Action collégiale sans la case : tous les atouts de faction sont payés par la réserve
    assert.equal(calculerCoutJetons({ actionCollegiale: true, nbAtouts: 2, nbFactionAtouts: 2 }).jetonsReserveMinimum, 2)
  })

  test("cumul de toutes les options", () => {
    const cout = calculerCoutJetons({
      actionCollegiale: true,
      premierAtoutCoche: true,
      nbAtouts: 3,
      deMerveilleux: true,
      effetMagique: true,
      niveauEffetMagique: 3,
      niveauMaitrise: 1,
    })
    // 2 atouts + 1 action collégiale + 1 dé merveilleux + 1 effet magique + 2 niveaux manquants
    assert.equal(cout.total, 7)
  })
})

describe("jetonsARepartir", () => {
  test("la complication couvre une partie du coût, sans descendre sous 0", () => {
    assert.equal(jetonsARepartir(3, 0), 3)
    assert.equal(jetonsARepartir(3, 2), 1)
    assert.equal(jetonsARepartir(2, 3), 0)
  })
})

describe("verifierRepartition", () => {
  const base = { jetonsConscience: 1, jetonsReserve: 1, aRepartir: 2, dispoConscience: 3, dispoReserve: 3 }

  test("répartition exacte et jetons disponibles : lancer possible", () => {
    assert.deepEqual(verifierRepartition(base), { possible: true, erreurs: [] })
  })

  test("répartition incomplète", () => {
    assert.deepEqual(verifierRepartition({ ...base, jetonsReserve: 0 }).erreurs, ["repartition"])
  })

  test("trop de jetons répartis", () => {
    assert.deepEqual(verifierRepartition({ ...base, jetonsReserve: 2 }).erreurs, ["depassement", "repartition"])
  })

  test("conscience insuffisante", () => {
    assert.deepEqual(verifierRepartition({ ...base, jetonsConscience: 2, jetonsReserve: 0, dispoConscience: 1 }).erreurs, ["conscience"])
  })

  test("réserve insuffisante, ou vide sans MJ connecté", () => {
    assert.deepEqual(verifierRepartition({ ...base, dispoReserve: 0 }).erreurs, ["reserve"])
  })

  test("acteur introuvable", () => {
    assert.deepEqual(verifierRepartition({ ...base, dispoConscience: null }).erreurs, ["acteur"])
  })

  test("atouts de faction : minimum de jetons de la réserve", () => {
    assert.deepEqual(verifierRepartition({ ...base, jetonsConscience: 2, jetonsReserve: 0, minimumReserve: 1 }).erreurs, ["minimumReserve"])
  })

  test("complication sans description", () => {
    assert.deepEqual(verifierRepartition({ ...base, descriptionManquante: true }).erreurs, ["description"])
  })

  test("rien à payer : lancer possible sans jeton", () => {
    assert.equal(verifierRepartition({ jetonsConscience: 0, jetonsReserve: 0, aRepartir: 0, dispoConscience: 0, dispoReserve: 0 }).possible, true)
  })
})

describe("analyserDes", () => {
  const de = (faces, ...valeurs) => ({ faces, total: valeurs.reduce((a, b) => a + b, 0), results: valeurs.map((result) => ({ result })) })

  test("un succès par tranche de 4 sur chaque dé", () => {
    assert.equal(analyserDes([de(12, 9), de(6, 4), de(6, 3)]).nbSucces, 3)
    assert.equal(analyserDes([de(8, 3)]).nbSucces, 0)
  })

  test("fausse note : 1 sur le dé d'harmonique", () => {
    const r = analyserDes([de(10, 1)])
    assert.equal(r.isDeHarmoniqueMin, true)
    assert.equal(r.isDeHarmoniqueMax, false)
    assert.equal(r.typeDeHarmonique, 10)
  })

  test("envolée : maximum du dé d'harmonique", () => {
    assert.equal(analyserDes([de(10, 10)]).isDeHarmoniqueMax, true)
  })

  test("1 ou maximum sur un dé d'atout : pas d'événement", () => {
    const r = analyserDes([de(10, 5), de(6, 1), de(6, 6)])
    assert.equal(r.isDeHarmoniqueMin || r.isDeHarmoniqueMax || r.isDeMerveilleuxMin || r.isDeMerveilleuxMax, false)
  })

  test("dé merveilleux en premier dé : incident ou merveille, pas de fausse note ni d'envolée", () => {
    const incident = analyserDes([de(20, 1)])
    assert.equal(incident.isDeMerveilleuxMin, true)
    assert.equal(incident.isDeHarmoniqueMin, false)
    const merveille = analyserDes([de(20, 20)])
    assert.equal(merveille.isDeMerveilleuxMax, true)
    assert.equal(merveille.isDeHarmoniqueMax, false)
  })

  test("dé merveilleux ajouté : incident ou merveille en plus du dé d'harmonique", () => {
    const r = analyserDes([de(12, 1), de(20, 20)])
    assert.equal(r.isDeHarmoniqueMin, true)
    assert.equal(r.isDeMerveilleuxMax, true)
    assert.equal(analyserDes([de(12, 6), de(20, 1)]).isDeMerveilleuxMin, true)
  })

  test("aucun dé", () => {
    assert.deepEqual(analyserDes([]), {
      nbSucces: 0,
      typeDeHarmonique: null,
      isDeHarmoniqueMin: false,
      isDeHarmoniqueMax: false,
      isDeMerveilleuxMin: false,
      isDeMerveilleuxMax: false,
    })
  })
})
