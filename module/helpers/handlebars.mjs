/**
 * Register all handlebars helpers.
 */
export function registerHandlebars() {
  Handlebars.registerHelper("getDiceImage", function (value) {
    return `systems/penombre/assets/ui/${value}-marge.webp`
  })

  Handlebars.registerHelper("getJetonImage", function (value) {
    switch (value) {
      case true:
      case "actif":
        return `systems/penombre/assets/ui/jeton_face_active.webp`
      case false:
      case "inactif":
        return `systems/penombre/assets/ui/jeton_face_inactive.webp`
      case "perdu":
        return `systems/penombre/assets/ui/cercle.webp`
    }
  })

  // Répète le bloc n fois ; @index va de 1 à n
  Handlebars.registerHelper("times", function (n, block) {
    let accum = ""
    for (let i = 1; i <= n; ++i) {
      block.data.index = i
      block.data.first = i === 1
      block.data.last = i === n
      accum += block.fn(this)
    }
    return accum
  })

  Handlebars.registerHelper("displayNbSuccess", function (value) {
    const nbSuccess = Math.floor(value / 4)
    if (nbSuccess === 1) return game.i18n.localize("PENOMBRE.Roll.unSucces")
    else if (nbSuccess > 1) return game.i18n.format("PENOMBRE.Roll.nbSucces", { nb: nbSuccess })
    else return ""
  })
}
