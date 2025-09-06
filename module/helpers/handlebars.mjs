/**
 * Register all handlebars helpers.
 */
export function registerHandlebars() {
  Handlebars.registerHelper("getDiceImage", function (value) {
    return `/systems/penombre/assets/ui/${value}-marge.webp`
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

  Handlebars.registerHelper("times", function (n, block) {
    let accum = ""
    for (let i = 1; i <= n; ++i) {
      block.data.index = i
      block.data.first = i === 0
      block.data.last = i === n - 1
      accum += block.fn(this)
    }
    return accum
  })

  Handlebars.registerHelper("displayNbSuccess", function (value) {
    const nbSuccess = Math.floor(value / 4)
    if (nbSuccess === 1) return " (1 succès)"
    else if (nbSuccess > 1) return ` (${nbSuccess} succès)`
    else return ""
  })
}
