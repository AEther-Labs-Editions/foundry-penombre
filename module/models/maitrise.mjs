const { HTMLField, NumberField, StringField } = foundry.data.fields

export default class Maitrise extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Maitrise"]

  static defineSchema() {
    const schema = {}

    schema.description = new HTMLField({})
    schema.harmonique = new StringField({ required: true, nullable: false, initial: SYSTEM.HARMONIQUES.ame.id, choices: SYSTEM.HARMONIQUES })
    schema.prerequis = new StringField({})
    schema.niveau = new NumberField({ required: true, integer: true, initial: 1, min: 1, max: 5 })

    return schema
  }
}
