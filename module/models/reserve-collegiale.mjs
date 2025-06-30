const { TypedObjectField, BooleanField, SchemaField } = foundry.data.fields

export default class ReserveCollegiale extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {}

    schema.jetons = new TypedObjectField(
      new SchemaField({
        valeur: new BooleanField(),
      }),
      {
        validateKeys: (key) => {
          const numericKey = Number(key)
          return Number.isInteger(numericKey) && numericKey >= 1 && numericKey <= 10
        },
      },
    )

    return schema
  }
}
