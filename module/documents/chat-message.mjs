import PenombreRoll from "./roll.mjs"
import { verifierRequete } from "../helpers/mj.mjs"

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

  /**
   * Enriches the chat card HTML by updating the sender's avatar and name display.
   * Depending on content visibility, it uses either the associated actor's image and alias,
   * or the author's avatar and name. The method creates and replaces the sender's DOM elements
   * with the appropriate avatar and name.
   *
   * @param {HTMLElement} html The chat card HTML element to enrich.
   */
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

  /**
   * Enregistre, chez le MJ, la réponse d'une Éminence à une action collégiale sur le message principal.
   * La requête est refusée si le message n'est pas le message principal d'une action collégiale, si l'Éminence
   * n'était pas attendue ou n'appartient pas à l'expéditeur, ou si le jet joint n'est pas un jet lié à ce message.
   * Une réponse n'est acceptée que si l'Éminence n'a pas encore répondu, ou pour mettre à jour les succès
   * d'un jet déjà compté après une relance.
   *
   * @param {Object} params
   * @param {string} params.existingMessageId Identifiant du message principal
   * @param {string} params.actorId Identifiant de l'Éminence qui répond
   * @param {boolean} params.answer Vrai si elle participe
   * @param {string} [params.newMessageId] Identifiant du message de son jet, si elle participe
   * @param {object} [context] Contexte de la requête
   * @param {User} [context.user] Utilisateur qui envoie la requête
   * @returns {Promise<void>}
   */
  static async _handleQueryMessageParticipation({ existingMessageId, actorId, answer, newMessageId }, { user } = {}) {
    const message = game.messages.get(existingMessageId)
    verifierRequete(message?.type === "harmonique" && message.system.actionCollegiale && !message.system.actionCollegialeMessageLie, "existingMessageId")
    const reponse = typeof actorId === "string" ? message.system.messagesLies[actorId] : undefined
    verifierRequete(!!reponse, "actorId")
    const actor = game.actors.get(actorId)
    verifierRequete(!!actor && (!user || user.isGM || actor.testUserPermission(user, "OWNER")), "actorId")
    verifierRequete(typeof answer === "boolean", "answer")
    if (CONFIG.debug.penombre?.chat) console.debug("Pénombre | Participation au jet", existingMessageId, actorId, answer, newMessageId)

    if (answer) {
      const newMessage = game.messages.get(newMessageId)
      verifierRequete(
        newMessage?.type === "harmonique" &&
          newMessage.system.actionCollegialeMessageLie &&
          newMessage.system.idMessageOrigine === existingMessageId &&
          newMessage.speaker.actor === actorId &&
          newMessage.rolls[0] instanceof PenombreRoll,
        "newMessageId",
      )
      // Après une réponse, seule la mise à jour du jet déjà compté (relance) est acceptée
      const miseAJourApresRelance = reponse.participe && reponse.messageId === newMessageId
      if (reponse.reponseFaite && !miseAJourApresRelance) throw new Error(game.i18n.localize("PENOMBRE.Warnings.actionCollegialeClose"))

      const { nbSucces } = PenombreRoll.analyseRollResult(newMessage.rolls[0])
      await message.update({
        [`system.messagesLies.${actorId}.messageId`]: newMessageId,
        [`system.messagesLies.${actorId}.reponseFaite`]: true,
        [`system.messagesLies.${actorId}.participe`]: true,
        [`system.messagesLies.${actorId}.nbSucces`]: nbSucces,
      })
    } else {
      if (reponse.reponseFaite) throw new Error(game.i18n.localize("PENOMBRE.Warnings.actionCollegialeClose"))
      await message.update({
        [`system.messagesLies.${actorId}.reponseFaite`]: true,
        [`system.messagesLies.${actorId}.participe`]: false,
      })
    }
  }
}
