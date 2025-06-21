import { SYSTEM } from "../config/system.mjs"

const { BooleanField, StringField } = foundry.data.fields

export default class Pouvoir extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Pouvoir"]

  static defineSchema() {
    const schema = {}

    schema.utilise = new BooleanField()
    schema.description = new StringField({})
    schema.type = new StringField({ required: true, nullable: false, initial: SYSTEM.POUVOIR_TYPES.naissance.id, choices: SYSTEM.POUVOIR_TYPES })

    return schema
  }
}
