import { SYSTEM } from "../config/system.mjs"

export default class Eminence extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    schema.peuple = new fields.StringField({
      required: true,
      nullable: false,
      initial: SYSTEM.PEUPLES.ameAccouchee.id,
      choices: SYSTEM.PEUPLES,
    })

    schema.cle = new fields.StringField({
      required: true,
      nullable: false,
      initial: SYSTEM.HARMONIQUES.ame.id,
      choices: SYSTEM.HARMONIQUES,
    })

    // Harmoniques
    const harmoniqueField = (label) => {
      const schema = {
        valeur: new fields.StringField({
          required: true,
          nullable: false,
          initial: SYSTEM.HARMONIQUES_VALUES.D4,
          choices: Object.fromEntries(Object.entries(SYSTEM.HARMONIQUES_VALUES).map(([key, value]) => [value, { label: `${value}` }])),
        }),
      }
      return new fields.SchemaField(schema, { label })
    }

    schema.harmoniques = new fields.SchemaField(
      Object.values(SYSTEM.HARMONIQUES).reduce((obj, harmonique) => {
        obj[harmonique.id] = harmoniqueField(harmonique.label)
        return obj
      }, {}),
    )

    return schema
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Eminence"]

  /** @override */
  prepareBaseData() {
    // Définition de la gamme en fonction du peuple
    switch (this.peuple) {
      case SYSTEM.PEUPLES.gnome.id:
      case SYSTEM.PEUPLES.nain.id:
      case SYSTEM.PEUPLES.centaure.id:
        this.gamme = SYSTEM.GAMMES.auberon.id
        break
      case SYSTEM.PEUPLES.meduse.id:
      case SYSTEM.PEUPLES.satyre.id:
      case SYSTEM.PEUPLES.minotaure.id:
        this.gamme = SYSTEM.GAMMES.horla.id
        break
      case SYSTEM.PEUPLES.ameAccouchee.id:
      case SYSTEM.PEUPLES.opalinDeLaRomance.id:
      case SYSTEM.PEUPLES.danseurAffranchi.id:
        this.gamme = SYSTEM.GAMMES.diamantin.id
        break
      case SYSTEM.PEUPLES.banshee.id:
      case SYSTEM.PEUPLES.feeNoire.id:
      case SYSTEM.PEUPLES.sirene.id:
        this.gamme = SYSTEM.GAMMES.melusine.id
        break
      case SYSTEM.PEUPLES.humain.id:
      case SYSTEM.PEUPLES.ogre.id:
      case SYSTEM.PEUPLES.geant.id:
        this.gamme = SYSTEM.GAMMES.grangousier.id
        break
    }

    // Définition du ton en fonction du peuple
    switch (this.peuple) {
      case SYSTEM.PEUPLES.banshee.id:
      case SYSTEM.PEUPLES.centaure.id:
      case SYSTEM.PEUPLES.minotaure.id:
      case SYSTEM.PEUPLES.ogre.id:
      case SYSTEM.PEUPLES.opalinDeLaRomance.id:
        this.ton = SYSTEM.TONS.capitan.id
        break
      case SYSTEM.PEUPLES.danseurAffranchi.id:
      case SYSTEM.PEUPLES.geant.id:
      case SYSTEM.PEUPLES.gnome.id:
      case SYSTEM.PEUPLES.satyre.id:
      case SYSTEM.PEUPLES.sirene.id:
        this.ton = SYSTEM.TONS.mascarille.id
        break
      case SYSTEM.PEUPLES.ameAccouchee.id:
      case SYSTEM.PEUPLES.feeNoire.id:
      case SYSTEM.PEUPLES.humain.id:
      case SYSTEM.PEUPLES.meduse.id:
      case SYSTEM.PEUPLES.nain.id:
        this.ton = SYSTEM.TONS.cassandre.id
        break
    }
  }
}
