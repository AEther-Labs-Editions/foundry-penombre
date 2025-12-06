const { ux, sidebar } = foundry.applications

export default class PenombreCombatTracker extends sidebar.tabs.CombatTracker {
  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    // Supprime l'affichage de l'initiative et des boutons de roll d'initiative
    this.element.querySelector('.encounter-controls.combat .control-buttons.left [data-action="rollAll"]')?.remove()
    this.element.querySelector('.encounter-controls.combat .control-buttons.left [data-action="rollNPC"]')?.remove()
    this.element.querySelectorAll(".token-initiative").forEach((el) => el.remove())

    new ux.DragDrop.implementation({
      dragSelector: ".combatant",
      dropSelector: ".combat-tracker",
      permissions: {
        dragstart: () => game.user.isGM,
        drop: () => game.user.isGM,
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element)
  }

  /**
   * An event that occurs when a drag workflow begins for a draggable combatant on the combat tracker.
   * @param {DragEvent} event       The initiating drag start event.
   * @returns {Promise<void>}
   * @protected
   */
  async _onDragStart(event) {
    const li = event.currentTarget
    const combatant = this.viewed.combatants.get(li.dataset.combatantId)
    if (!combatant) return
    const dragData = combatant.toDragData()
    // Contient type et uuid
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
  }

  /**
   * An event that occurs when a drag workflow moves over a drop target.
   * @param {DragEvent} event
   * @protected
   */
  _onDragOver(event) {}

  /**
   * An event that occurs when data is dropped into a drop target.
   * @param {DragEvent} event
   * @returns {Promise<void>}
   * @protected
   */
  async _onDrop(event) {
    event.stopPropagation()
    const data = ux.TextEditor.implementation.getDragEventData(event)
    // Attributs type uuid
    const combatant = fromUuidSync(data.uuid)
    if (!combatant) return

    const targetCombatantLi = event.target.closest("li.combatant")
    const targetCombatantId = targetCombatantLi?.dataset.combatantId
    const targetCombatant = combatant.parent.combatants.get(targetCombatantId)
    if (!targetCombatant) return

    // Nouvelle initiative du combatant droppé = initiative du combatant cible
    const newInitiative = targetCombatant.initiative

    // Le combattant droppé avait une initiative inférieure à celle du combattant cible
    if (combatant.initiative < targetCombatant.initiative) {
      // Le combattant cible est décalé d'une unité pour laisser la place
      await targetCombatant.update({ initiative: targetCombatant.initiative - 10 })
    }
    // Le combattant droppé avait une initiative supérieure ou égale à celle du combattant cible
    else if (combatant.initiative >= targetCombatant.initiative) {
      // Le combattant cible est décalé d'une unité pour laisser la place
      await targetCombatant.update({ initiative: targetCombatant.initiative + 10 })
    }
    await combatant.update({ initiative: newInitiative })
  }
}
