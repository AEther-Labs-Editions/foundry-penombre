import PenombreRoll from "./roll.mjs"

export default class PenombreMessage extends ChatMessage {
  /** @inheritDoc */
  async renderHTML({ canDelete, canClose = false, ...rest } = {}) {
    const html = await super.renderHTML({ canDelete, canClose, ...rest })
    this._enrichChatCard(html)
    return html
  }

  /**
   * Get the Actor which is the author of a chat card.
   * @returns {Actor|void}
   */
  getAssociatedActor() {
    if (this.speaker.scene && this.speaker.token) {
      const scene = game.scenes.get(this.speaker.scene)
      const token = scene?.tokens.get(this.speaker.token)
      if (token) return token.actor
    }
    return game.actors.get(this.speaker.actor)
  }

  _enrichChatCard(html) {
    const actor = this.getAssociatedActor()

    let img
    let nameText
    if (this.isContentVisible) {
      img = actor?.img ?? this.author.avatar
      nameText = this.alias
    } else {
      img = this.author.avatar
      nameText = this.author.name
    }

    const avatar = document.createElement("a")
    avatar.classList.add("avatar")
    if (actor) avatar.dataset.uuid = actor.uuid
    const avatarImg = document.createElement("img")
    Object.assign(avatarImg, { src: img, alt: nameText })
    avatar.append(avatarImg)

    const name = document.createElement("span")
    name.classList.add("name-stacked")
    const title = document.createElement("span")
    title.classList.add("title")
    title.append(nameText)
    name.append(title)

    const sender = html.querySelector(".message-sender")
    sender?.replaceChildren(avatar, name)
  }

  static async _handleQueryMessageParticipation({ existingMessageId, actorId, answer, nbSucces, newMessageId }) {
    const message = game.messages.get(existingMessageId)
    let newMessage
    if (newMessageId) {
      newMessage = game.messages.get(newMessageId)
    }
    if (!message) return

    // Vérifie que le message est un jet de dés de Pénombre
    if (message.isRoll && message.rolls[0] && message.rolls[0] instanceof PenombreRoll) {
      console.log("Pénombre | Participation au jet", existingMessageId, actorId, answer, nbSucces, newMessageId)
      // Met à jour la réponse de l'acteur dans le message
      if (answer) {
        // Si la réponse est positive, on enregistre le nombre de succès
        const nbSucces = PenombreRoll.analyseRollResult(newMessage.rolls[0])
        await message.update({
          [`system.messagesLies.${actorId}.messageId`]: newMessageId,
          [`system.messagesLies.${actorId}.reponseFaite`]: true,
          [`system.messagesLies.${actorId}.nbSucces`]: nbSucces,
        })
      } else {
        await message.update({
          [`system.messagesLies.${actorId}.reponseFaite`]: true,
        })
      }
    }
  }
}
