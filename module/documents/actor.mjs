import PenombreRoll from "./roll.mjs"
export default class PenombreActor extends Actor {
  async rollHarmonique(harmonique, { rollMode = undefined } = {}) {
    let rollValue = this.system.harmoniques[harmonique].valeur
    const atouts = this.itemTypes.atout
    let roll = await PenombreRoll.prompt({ actor: this, harmonique, rollValue, atouts })
    if (!roll) return null
    const speaker = ChatMessage.getSpeaker({ actor: this, scene: canvas.scene })
    await roll.toMessage(
      {
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        type: "harmonique",
        system: { harmonique: roll.options.harmonique, actionCollegiale: roll.options.actionCollegiale, difficulte: roll.options.difficulte },
        speaker,
      },
      { rollMode: roll.options.rollMode },
    )
  }
}
