export default class Macros {
  /**
   * Attempt to create a macro from the dropped data. Will use an existing macro if one exists.
   * @param {object} dropData     The dropped data
   * @param {number} slot         The hotbar slot to use
   */
  static async create(dropData, slot) {
    const macroData = { type: "script", scope: "actor" }
    switch (dropData.type) {
      case "penombre.harmonique":
        foundry.utils.mergeObject(macroData, {
          name: `Jet de ${game.i18n.localize(`PENOMBRE.ui.${dropData.harmonique}`)} (${dropData.actorName})`,
          img: `systems/penombre/assets/ui/${dropData.valeur}.webp`,
          command: `await game.system.api.helpers.Macros.rollHarmonique("${dropData.actorId}", "${dropData.harmonique}")`,
          flags: { "penombre.macros.harmonique": true },
        })
        break
      default:
        return
    }

    // Assign the macro to the hotbar
    let macro = game.macros.find((m) => m.name === macroData.name && m.command === macroData.command && m.author.isSelf)
    if (!macro) {
      macro = await Macro.create(macroData)
      game.user.assignHotbarMacro(macro, slot)
    }
  }

  static async rollHarmonique(actorId, harmonique) {
    let actor
    if (actorId) actor = game.actors.get(actorId)
    if (!actor) return
    if (actor) {
      await actor.rollHarmonique({ harmonique })
    }
  }
}
