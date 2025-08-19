const { SchemaField, NumberField, StringField, BooleanField, ArrayField, TypedObjectField, DocumentIdField } = foundry.data.fields
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
      difficulte: new NumberField({ min: 0, max: 20 }),
      // Indique si une relance a été faite dans ce message
      relanceFaite: new BooleanField({ initial: false }),
      actionCollegiale: new BooleanField({ initial: false }),
      // Ce message est lié à une action collégiale
      // Si c'est faux et que c'est une action collégiale, alors ce message est le message d'origine
      // Sinon c'est vrai et que c'est une action collégiale, alors ce message est lié à l'action collégiale
      actionCollegialeMessageLie: new BooleanField({ initial: false }),
      // Tous les messages liés à ce message dans le cas où c'est le message d'origine de l'action collégiale
      messagesLies: new TypedObjectField(
        new SchemaField({
          messageId: new DocumentIdField(),
          // Indique si une réponse a été faite à ce message : participe ou ne participe pas
          reponseFaite: new BooleanField({ initial: false }),
          nbSucces: new NumberField({ initial: 0, min: 0 }),
        }),
        { validateKey: foundry.data.validators.isValidId },
      ),
      idMessageOrigine: new StringField(),
    })
  }
}
