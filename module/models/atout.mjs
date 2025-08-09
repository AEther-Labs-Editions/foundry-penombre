const { HTMLField, NumberField } = foundry.data.fields

export default class Atout extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Atout"]

  static defineSchema() {
    const schema = {}

    schema.description = new HTMLField({})
    schema.valeur = new NumberField({ required: true, integer: true, initial: 0, min: 0, max: 3 })

    return schema
  }
}
