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

    if (targetCombatant === combatant) return
    const combat = combatant.parent

    // Nouvel ordre : le combattant glissé prend la place de la cible, au-dessus s'il remonte, en dessous s'il descend
    const turns = combat.turns
    const remonte = turns.indexOf(combatant) > turns.indexOf(targetCombatant)
    const ordre = turns.filter((c) => c !== combatant)
    const indexCible = ordre.indexOf(targetCombatant)
    ordre.splice(remonte ? indexCible : indexCible + 1, 0, combatant)

    // Les valeurs d'initiative existantes, de la plus haute à la plus basse, sont redistribuées dans ce nouvel ordre :
    // seules les positions changent, et un combattant qui entre ensuite garde sa tranche (2xx ou 1xx)
    const valeurs = turns.map((c) => c.initiative ?? 0).sort((a, b) => b - a)
    // Valeurs strictement décroissantes, pour que deux combattants à égalité ne soient pas départagés autrement
    for (let i = 1; i < valeurs.length; i++) {
      if (valeurs[i] >= valeurs[i - 1]) valeurs[i] = valeurs[i - 1] - 1
    }
    const updates = ordre.map((c, i) => ({ _id: c.id, initiative: valeurs[i] })).filter((u) => combat.combatants.get(u._id).initiative !== u.initiative)
    if (updates.length) await combat.updateEmbeddedDocuments("Combatant", updates)
  }
}
