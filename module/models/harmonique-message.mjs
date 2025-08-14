const { SchemaField, NumberField, StringField, BooleanField, ArrayField } = foundry.data.fields
import BaseMessageData from "./base-message.mjs"

export default class HarmoniqueMessageData extends BaseMessageData {
  static defineSchema() {
    return foundry.utils.mergeObject(super.defineSchema(), {
      harmonique: new StringField({
        required: true,
        nullable: false,
        initial: SYSTEM.HARMONIQUES.ame.id,
        choices: SYSTEM.HARMONIQUES,
      }),
      atouts: new ArrayField(
        new SchemaField({
          nom: new StringField({ required: true, nullable: false }),
          valeur: new NumberField({ required: true, integer: true, initial: 0, min: 0, max: 3 }),
        }),
      ),
      actionCollegiale: new BooleanField({ initial: false }),
      difficulte: new NumberField({ min: 0, max: 20 }),
      relanceFaite: new BooleanField({ initial: false }),
    })
  }
}
