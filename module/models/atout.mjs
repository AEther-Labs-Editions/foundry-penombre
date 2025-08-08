import { SYSTEM } from "../config/system.mjs"

const { BooleanField, StringField } = foundry.data.fields

export default class Atout extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Atout"]

  static defineSchema() {
    const schema = {}
    // schema.valeur = new NumberField({ ...requiredInteger, initial: 0, min: 0, max: 3 })
    schema.description = new StringField({})

    return schema
  }
}