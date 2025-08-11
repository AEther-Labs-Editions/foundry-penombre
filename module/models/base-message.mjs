export default class BaseMessageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      speaker: new fields.ObjectField({ required: true }),
    }
  }
}
