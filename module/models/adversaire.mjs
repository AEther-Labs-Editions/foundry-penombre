const { SchemaField, NumberField } = foundry.data.fields

export default class Adversaire extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Adversaire"]

  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    // Personnage
    schema.adversite = new SchemaField({
      valeur: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
      max: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
    })
    schema.resilience = new NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    })
    schema.dissonance = new NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    })
    /*
    schema.datas = new SchemaField({
      description: new NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      actionsAdverses: new NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      actionsDissonance: new NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      intrigues: new NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    })
  */

    // Descriptions : sous forme d'un item

    // Actions : sous forme d'un item

    // Intrigues : sous forme d'un item

    return schema
  }


  /** @override */
  prepareBaseData() {
  }


  /** @override */
  async _preUpdate(changed, options, user) {
    return super._preUpdate(changed, options, user)
  }

}