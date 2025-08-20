const { HTMLField } = foundry.data.fields

export default class Description extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Description"]

  static defineSchema() {
    const schema = {}

    schema.description = new HTMLField({})

    return schema
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    let updates = {}
    const stats = this.parent._stats

    // Pour un acteur non dupliqué, non provenant d'un compendium et non exporté
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource) {
      // Image par défaut
      if (!foundry.utils.hasProperty(data, "img")) {
        updates.img = "systems/penombre/assets/icons/description.png"
      }
    }
    this.parent.updateSource(updates)
  }
}
