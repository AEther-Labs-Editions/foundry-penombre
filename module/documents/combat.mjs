export default class PenombreCombat extends foundry.documents.Combat {
  /** @override */
  async _onEnter(combatant) {
    await super._onEnter(combatant)
    await combatant.update({ initiative: this.#getInitiative(combatant) })
  }

  // L'initiative est en 2xx pour les éminences et en 1xx pour les adversaires : les éminences agissent en premier
  #getInitiative(combatant) {
    if (combatant.isNPC) {
      return Math.ceil(100 + Math.random() * 100)
    } else {
      return Math.ceil(200 + Math.random() * 100)
    }
  }
}
