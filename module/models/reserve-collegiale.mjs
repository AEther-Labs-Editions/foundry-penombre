const { TypedObjectField, BooleanField, SchemaField, StringField, NumberField } = foundry.data.fields

export default class ReserveCollegiale extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {}

    schema.jetons = new TypedObjectField(
      new SchemaField({
        valeur: new BooleanField(), // True si le jeton est disponible, false sinon
      }),
      {
        validateKeys: (key) => {
          const numericKey = Number(key)
          return Number.isInteger(numericKey) && numericKey >= 1 && numericKey <= 10
        },
      },
    )

    schema.factions = new TypedObjectField(
      new SchemaField({
        nom: new StringField({ required: true, blank: false, initial: "Nouvelle faction" }),
        atouts: new TypedObjectField(
          new SchemaField({
            nom: new StringField({ required: true, blank: false, initial: "Nouvel atout" }),
            valeur: new NumberField({ required: true, integer: true, initial: 1, min: 1, max: 3 }),
          }),
        ),
        complications: new TypedObjectField(
          new SchemaField({
            nom: new StringField({ required: true, blank: false, initial: "Nouvelle complication" }),
            valeur: new NumberField({ required: true, integer: true, initial: 1, min: 1, max: 3 }),
          }),
        ),
      }),
    )

    return schema
  }

  get nbJetonsRestants() {
    return Object.values(this.jetons).filter((jeton) => jeton.valeur === true).length
  }

  /**
   * Retourne tous les atouts de toutes les factions sous forme de tableau plat.
   * @returns {Array<object>} Tableau d'atouts avec id, factionId, factionNom, name, valeur, type
   */
  get allFactionAtouts() {
    const atouts = []
    for (const [factionId, faction] of Object.entries(this.factions || {})) {
      for (const [atoutId, atout] of Object.entries(faction.atouts || {})) {
        atouts.push({
          id: atoutId,
          factionId,
          factionNom: faction.nom,
          name: atout.nom,
          valeur: atout.valeur,
          type: "atout",
        })
      }
    }
    return atouts
  }

  /**
   * Retourne toutes les complications de toutes les factions sous forme de tableau plat.
   * @returns {Array<object>} Tableau de complications avec id, factionId, factionNom, name, valeur, type
   */
  get allFactionComplications() {
    const complications = []
    for (const [factionId, faction] of Object.entries(this.factions || {})) {
      for (const [compId, comp] of Object.entries(faction.complications || {})) {
        complications.push({
          id: compId,
          factionId,
          factionNom: faction.nom,
          name: comp.nom,
          valeur: comp.valeur,
          type: "complication",
        })
      }
    }
    return complications
  }

  static changeNbJetons(newNbJetons) {
    if (game.settings.get("penombre", "styleJeu") === "demo" && newNbJetons !== 10) {
      ui.notifications.error(game.i18n.localize("PENOMBRE.Warnings.limiteNbJetonsDemo"), { permanent: true })
    }
  }
}
