import PenombreRoll from "./roll.mjs"
export default class PenombreActor extends Actor {
  /**
   * Rolls a harmonique for the actor, optionally handling collegial actions and posting the result to chat.
   *
   * @async
   * @param {string} harmonique The name of the harmonique to roll.
   * @param {string} [messageType="principal"/"lie"] The type of roll, defaults to "principal".
   * @param {Object} [options={}] Additional options for the roll.
   * @param {string|undefined} [options.rollMode] The roll mode to use.
   * @returns {Promise<void|null>} Resolves when the roll is completed and the message is posted, or null if cancelled.
   */
  async rollHarmonique({ harmonique, messageType = "principal", idMessageOrigine = null, rollMode = undefined } = {}) {
    let rollValue = this.system.harmoniques[harmonique].valeur
    const atouts = this.itemTypes.atout
    let roll = await PenombreRoll.prompt({ messageType, actor: this, harmonique, rollValue, atouts })
    if (!roll) return null

    const speaker = ChatMessage.getSpeaker({ actor: this, scene: canvas.scene })

    // Message principal : si c'est une action collégiale
    let messagesLies = {}
    if (messageType === "principal" && roll.options.actionCollegiale) {
      // Préparation des messages liées : récupération des autres joueurs connectés
      const players = game.users.filter((user) => !user.isSelf && user.active && user.character)
      for (const player of players) {
        messagesLies[player.character.id] = {
          messageId: null, // On mettra à jour ce champ plus tard
          reponseFaite: false,
          nbSucces: 0,
        }
      }
    }
    const chatMessage = await roll.toMessage(
      {
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        type: "harmonique",
        system: {
          harmonique: roll.options.harmonique,
          difficulte: roll.options.difficulte,
          actionCollegiale: messageType === "principal" ? roll.options.actionCollegiale : true,
          actionCollegialeMessageLie: messageType === "lie",
          messagesLies,
          idMessageOrigine: messageType === "principal" ? null : idMessageOrigine,
        },
        speaker,
      },
      { rollMode: roll.options.rollMode },
    )

    return chatMessage
  }
}
