const { SchemaField, NumberField, StringField, BooleanField, ArrayField, TypedObjectField, DocumentIdField } = foundry.data.fields
import { SYSTEM } from "../config/system.mjs"
import BaseMessageData from "./base-message.mjs"
import PenombreRoll from "../documents/roll.mjs"
import { demanderAuMJ, mjConnecte } from "../helpers/mj.mjs"

export default class HarmoniqueMessageData extends BaseMessageData {
  static defineSchema() {
    return foundry.utils.mergeObject(super.defineSchema(), {
      harmonique: new StringField({
        required: true,
        nullable: false,
        initial: SYSTEM.HARMONIQUES.ame.id,
        choices: SYSTEM.HARMONIQUES,
      }),
      atouts: new ArrayField(
        new SchemaField({
          nom: new StringField({ required: true, nullable: false }),
          valeur: new NumberField({ required: true, integer: true, initial: 0, min: 0, max: 3 }),
        }),
      ),
      difficulte: new NumberField({ min: 0, max: 20 }),

      // Indique si une relance a été faite dans ce message
      relanceFaite: new BooleanField({ initial: false }),

      // Indique si le message a déjà été traité par DiceSoNice
      dsnDejaTraite: new BooleanField({ initial: false }),

      // Est-ce une action collégiale ?
      actionCollegiale: new BooleanField({ initial: false }),

      // Est-il lié à une action collégiale ?
      // Si c'est faux et que c'est une action collégiale, alors ce message est le message d'origine
      // Sinon c'est vrai et que c'est une action collégiale, alors ce message est lié à l'action collégiale
      actionCollegialeMessageLie: new BooleanField({ initial: false }),

      // Tous les messages liés à ce message dans le cas où c'est le message d'origine de l'action collégiale
      messagesLies: new TypedObjectField(
        new SchemaField({
          messageId: new DocumentIdField(),
          // Indique si une réponse a été faite à ce message : participe ou ne participe pas
          reponseFaite: new BooleanField({ initial: false }),
          participe: new BooleanField({ initial: false }),
          nbSucces: new NumberField({ initial: 0, min: 0 }),
        }),
        { validateKey: foundry.data.validators.isValidId },
      ),
      idMessageOrigine: new StringField(),
    })
  }

  // Toutes réponses attendues ont été faites
  get toutesReponsesFaites() {
    return Object.values(this.messagesLies).every((msg) => msg.reponseFaite)
  }

  /**
   * Clôture de l'action collégiale par le MJ : les réponses manquantes passent à « ne participe pas »,
   * ce qui affiche le résultat du message principal.
   * @returns {Promise<void>}
   */
  async cloreActionCollegiale() {
    const update = {}
    for (const [actorId, reponse] of Object.entries(this.messagesLies)) {
      if (reponse.reponseFaite) continue
      update[`system.messagesLies.${actorId}.reponseFaite`] = true
      update[`system.messagesLies.${actorId}.participe`] = false
    }
    if (!foundry.utils.isEmpty(update)) await this.parent.update(update)
  }

  /**
   * Modifie le contenu HTML d'un message en fonction de l'état d'une action collégiale.
   * Si toutes les réponses sont faites, calcule le nombre total de succès à partir du jet principal et des messages liés,
   * détermine si la difficulté est atteinte, puis affiche le résultat via un template Handlebars.
   *
   * @async
   * @param {PenombreMessage} message Le document ChatMessage en cours de rendu.
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   * @returns {Promise<void>} Résout lorsque le HTML a été mis à jour.
   */
  async alterMessageHTML(message, html) {
    if (CONFIG.debug.penombre?.chat) console.debug("Pénombre | alterMessageHTML", this)
    // C'est une action collégiale
    if (this.actionCollegiale) {
      let isMessagePrincipal = true
      // C'est le message principal
      if (!this.actionCollegialeMessageLie) {
        // Si toutes les réponses ne sont pas faites
        if (!this.toutesReponsesFaites) {
          if (CONFIG.debug.penombre?.chat) console.debug("Pénombre | alterMessageHTML | Message principal | Certaines réponses sont manquantes.", this)
          // Le résultat du dé est masqué
          const rollResultSelfDiv = html.querySelector(".dice-result")
          if (rollResultSelfDiv) rollResultSelfDiv.style.display = "none"
        }
        // Si toutes les réponses sont faites
        else {
          if (CONFIG.debug.penombre?.chat) console.debug("Pénombre | alterMessageHTML | Toutes les réponses ont été faites.", this)
          const rollResultOtherDiv = html.querySelector(".roll-result-collegiale")
          if (!rollResultOtherDiv) return

          const roll = this.parent.rolls[0]
          const rollResults = PenombreRoll.analyseRollResult(roll)
          const nbSucces = rollResults.nbSucces
          // Seules les participantes sont listées (le séparateur ne dépend que d'elles)
          const autresSucces = Object.entries(this.messagesLies)
            .filter(([, value]) => value.participe)
            .map(([id, value]) => ({
              actor: game.actors.get(id)?.name ?? game.i18n.localize("PENOMBRE.Roll.acteurInconnu"),
              nbSucces: value.nbSucces,
            }))
          const totalSucces = nbSucces + autresSucces.reduce((acc, curr) => acc + curr.nbSucces, 0)

          const hasDifficulte = roll.options.difficulte !== ""
          const isSuccess = hasDifficulte && totalSucces >= roll.options.difficulte
          let succesManquants = 0
          if (hasDifficulte && !isSuccess) {
            succesManquants = Math.max(roll.options.difficulte - totalSucces, 0)
          }

          // Si le joueur est à l'origine du message, affichage du résultat du roll dans Dice So Nice (visible par tous les joueurs)
          if (game.modules.get("dice-so-nice")?.active && game.user.id === this.parent.author.id && message.system.dsnDejaTraite === false) {
            // Paramètres : roll, user, synchronize, whisper, blind ; whisper et blind respectent le mode du jet
            const { whisper, blind } = PenombreRoll._visibiliteDSN(roll.options.rollMode)
            await game.dice3d.showForRoll(roll, game.user, true, whisper, blind)
            await message.update({ "system.dsnDejaTraite": true })
          }

          const content = await foundry.applications.handlebars.renderTemplate("systems/penombre/templates/chat/action-collegiale.hbs", {
            isMessagePrincipal,
            nbSucces,
            autresSucces,
            hasAutresSucces: autresSucces.length > 0,
            totalSucces,
            hasDifficulte,
            difficulte: roll.options.difficulte,
            isSuccess,
            succesManquants,
          })
          rollResultOtherDiv.innerHTML = content
        }
      }
      // C'est un message lié
      else {
        isMessagePrincipal = false
        if (this.toutesReponsesFaites) {
          const rollResultOtherDiv = html.querySelector(".roll-result-collegiale")
          if (!rollResultOtherDiv) return

          const roll = this.parent.rolls[0]
          const rollResults = PenombreRoll.analyseRollResult(roll)
          const nbSucces = rollResults.nbSucces
          const content = await foundry.applications.handlebars.renderTemplate("systems/penombre/templates/chat/action-collegiale.hbs", {
            isMessagePrincipal,
            nbSucces,
          })
          rollResultOtherDiv.innerHTML = content
        }
      }
    }
  }

  /**
   * Relance des dés sélectionnés, payée par un jeton de conscience ou par un jeton de la réserve collégiale.
   * Pour un jet lié à une action collégiale, le message principal est ensuite mis à jour par le MJ.
   * @param {"conscience"|"reserve"} source Origine du jeton dépensé
   * @param {string} messageId Message du jet
   * @param {string[]} des Indices des dés à relancer ("dé-résultat")
   * @param {Actor|undefined} actor Acteur qui a lancé les dés
   */
  async #relancer(source, messageId, des, actor) {
    if (des.length === 0) {
      ui.notifications.warn("PENOMBRE.Warnings.aucunDeSelectionne", { localize: true })
      return
    }

    // La relance d'un jet lié met à jour le message principal, ce que seul le MJ peut faire
    const jetLie = this.actionCollegialeMessageLie && this.idMessageOrigine
    if (jetLie && !mjConnecte()) {
      ui.notifications.warn("PENOMBRE.Warnings.mjAbsent", { localize: true })
      return
    }

    // Paiement d'un jeton
    if (source === "conscience") {
      if (!actor || actor.system.nbJetonsRestants === 0) {
        ui.notifications.warn(game.i18n.format("PENOMBRE.Warnings.jetonsConscienceInsuffisants", { actuel: 0, demande: 1 }))
        return
      }
      if (!(await actor.system.depenserJetons(1))) return
    } else {
      const avertirReserveVide = () => ui.notifications.warn(game.i18n.format("PENOMBRE.Warnings.jetonsReserveInsuffisants", { actuel: 0, demande: 1 }), { permanent: true })
      if (game.settings.get(SYSTEM.ID, "reserveCollegiale").nbJetonsRestants === 0) return avertirReserveVide()
      const paiement = await demanderAuMJ("penombre.updateReserveCollegialeFromRoll", { nbJetons: 1 })
      if (!paiement.ok) return
      if (!paiement.resultat?.paye) return avertirReserveVide()
    }

    await PenombreRoll.reroll(messageId, des)

    // Jet lié : le message principal reprend le nouveau résultat
    if (jetLie && actor) {
      await demanderAuMJ("penombre.updateMessageParticipation", {
        existingMessageId: this.idMessageOrigine,
        actorId: actor.id,
        answer: true,
        newMessageId: messageId,
      })
    }
  }

  async addListeners(html) {
    // Les boutons reroll n'est affiché que pour le MJ ou le joueur à l'origine du message
    if (game.user.isGM || this.parent.isAuthor) {
      html.querySelectorAll(".roll.die").forEach((btn) => {
        btn.classList.add("rerollable")
        btn.addEventListener("click", (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          // Ajoute la classe css dice-selected
          ev.currentTarget.classList.toggle("dice-selected")
        })
      })

      // Boutons de relance, affichés s'il reste au moins un jeton à dépenser
      const actor = game.actors.get(this.parent.speaker.actor)
      const relancePossible = {
        conscience: actor?.system.nbJetonsRestants > 0,
        reserve: game.settings.get(SYSTEM.ID, "reserveCollegiale").nbJetonsRestants > 0,
      }
      for (const [source, possible] of Object.entries(relancePossible)) {
        if (!possible) continue
        const bouton = html.querySelector(`.reroll-${source}`)
        bouton.classList.remove("hidden")
        bouton.addEventListener("click", async (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          const messageElement = ev.target.closest(".chat-message")
          const messageId = messageElement?.dataset.messageId
          if (!messageId) return
          const des = [...messageElement.querySelectorAll(".dice-selected")].map((de) => de.dataset.indice)
          await this.#relancer(source, messageId, des, actor)
        })
      }
    }

    // Le MJ peut clore une action collégiale qui attend encore des réponses
    if (game.user.isGM && this.actionCollegiale && !this.actionCollegialeMessageLie && !this.toutesReponsesFaites) {
      const boutonClore = html.querySelector(".clore-action")
      if (boutonClore) {
        boutonClore.classList.remove("hidden")
        boutonClore.addEventListener("click", async (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          const confirme = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.localize("PENOMBRE.ui.cloreAction") },
            content: `<p>${game.i18n.localize("PENOMBRE.ui.cloreActionConfirmation")}</p>`,
          })
          if (confirme) await this.cloreActionCollegiale()
        })
      }
    }

    // Les boutons pour participer à un jet collégial ne sont visibles que par les joueuses dont la réponse est attendue
    const currentActorId = game.user.character?.id
    const reponseAttendue = currentActorId && this.messagesLies[currentActorId] && !this.messagesLies[currentActorId].reponseFaite
    if (this.actionCollegiale && !this.actionCollegialeMessageLie && !this.parent.isAuthor && reponseAttendue) {
      html.querySelector(".participate-yes").classList.remove("hidden")
      html.querySelector(".participate-no").classList.remove("hidden")

      const currentActorId = game.user.character?.id

      html.querySelector(".participate-yes").addEventListener("click", async (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        // Sans MJ, la participation ne pourrait pas être enregistrée sur le message principal
        if (!mjConnecte()) {
          ui.notifications.warn("PENOMBRE.Warnings.mjAbsent", { localize: true })
          return
        }
        const messageId = ev.target.closest(".chat-message").dataset.messageId
        const harmonique = this.harmonique
        const actor = game.actors.get(currentActorId)
        const chatMessage = await actor.rollHarmonique({ harmonique, messageType: "lie", idMessageOrigine: messageId })
        if (chatMessage) {
          await demanderAuMJ("penombre.updateMessageParticipation", {
            existingMessageId: messageId,
            actorId: currentActorId,
            answer: true,
            newMessageId: chatMessage.id,
          })
        }
      })

      html.querySelector(".participate-no").addEventListener("click", async (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        const messageId = ev.target.closest(".chat-message").dataset.messageId
        await demanderAuMJ("penombre.updateMessageParticipation", { existingMessageId: messageId, actorId: currentActorId, answer: false })
      })
    }
  }
}
