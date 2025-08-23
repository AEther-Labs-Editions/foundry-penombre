import { SYSTEM } from "../config/system.mjs"

const { SchemaField, NumberField, StringField } = foundry.data.fields

console.log('Je passe bien par là')

export default class Adversaire extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Adversaire"]

  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    // Personnage
    schema.description = new StringField({})
    schema.adversite = new SchemaField({
      valeur: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
        max: 0,
      }),
      max: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
    })
    schema.resilience = new SchemaField({
      valeur: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
        max: 0,
      }),
      max: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
    })
    schema.dissonance = new SchemaField({
      harmonique: new StringField({
        required: true,
        nullable: false,
        initial: SYSTEM.HARMONIQUES_2.ame.id,
        choices: SYSTEM.HARMONIQUES_2
       }),
      valeur: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
        max: 0,
      }),
      max: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
    })
    
    // Actions : sous forme d'un item

    // Intrigues : sous forme d'un item

    return schema
  }

  /** @override */
  prepareBaseData() {
  }

  /** @override */
  async _preUpdate(changed, options, user) {
    // Si la valeur d'adversité max ou la valeur de dissonance max change, on met à jour...
    if (foundry.utils.hasProperty(changed, "system.adversite.max")) {
      foundry.utils.setProperty(changed, "system.adversite.valeur.max", changed.system.adversite.max)
      foundry.utils.setProperty(changed, "system.resilience.max", changed.system.adversite.max * 3)
      foundry.utils.setProperty(changed, "system.resilience.valeur.max", changed.system.adversite.max * 3)
    }
    if (foundry.utils.hasProperty(changed, "system.dissonance.max")) {
      foundry.utils.setProperty(changed, "system.dissonance.valeur.max", changed.system.dissonance.max)
    }
    return super._preUpdate(changed, options, user)
  }
}