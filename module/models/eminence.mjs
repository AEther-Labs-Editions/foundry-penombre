import { SYSTEM } from "../config/system.mjs"

const { SchemaField, NumberField, StringField, ArrayField } = foundry.data.fields

export default class Eminence extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Eminence"]

  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    // Personnage
    schema.peuple = new StringField({ required: true, nullable: false, initial: SYSTEM.PEUPLES.ameAccouchee.id, choices: SYSTEM.PEUPLES })
    schema.cle = new StringField({ required: true, nullable: false, initial: SYSTEM.HARMONIQUES.ame.id, choices: SYSTEM.HARMONIQUES })
    schema.potentiel = new SchemaField({
      pouvoirs: new NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      atouts: new NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      maitrises: new NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    })

    // Harmoniques
    const harmoniqueField = (label) => {
      const schema = {
        valeur: new StringField({
          required: true,
          nullable: false,
          initial: SYSTEM.HARMONIQUE_VALEURS.D4,
          choices: Object.fromEntries(Object.entries(SYSTEM.HARMONIQUE_VALEURS).map(([key, value]) => [value, { label: `${value}` }])),
        }),
      }
      return new SchemaField(schema, { label })
    }

    schema.harmoniques = new SchemaField(
      Object.values(SYSTEM.HARMONIQUES).reduce((obj, harmonique) => {
        obj[harmonique.id] = harmoniqueField(harmonique.label)
        return obj
      }, {}),
    )

    // Conscience
    schema.conscience = new SchemaField({
      valeur: new NumberField({
        ...requiredInteger,
        initial: 7,
        min: 0,
      }),
      max: new NumberField({
        ...requiredInteger,
        initial: 7,
        min: 0,
      }),
      jetons: new ArrayField(
        new SchemaField({
          statut: new StringField({
            required: true,
            nullable: false,
            initial: SYSTEM.JETON_STATUTS.actif.id,
            choices: SYSTEM.JETON_STATUTS,
          }),
        }),
      ),
      complications: new SchemaField({
        une: new SchemaField(this.createComplication()),
        deux: new SchemaField(this.createComplication()),
        trois: new SchemaField(this.createComplication()),
        quatre: new SchemaField(this.createComplication()),
      }),
    })

    // Timbre (Règles avancées)
    schema.timbre = new SchemaField({
      description: new StringField(),
      statut: new StringField({
        required: true,
        nullable: false,
        initial: SYSTEM.TIMBRES.harmonieux.id,
        choices: SYSTEM.TIMBRES,
      }),
      peste: new StringField(),
    })

    // Pouvoirs : sous forme d'un item

    // Atouts
    schema.atouts = new ArrayField(
      new SchemaField({
        description: new StringField({}),
        valeur: new NumberField({ ...requiredInteger, initial: 0, min: 0, max: 3 }),
      }),
    )

    // Maîtrises magiques
    schema.maitrises = new ArrayField(
      new SchemaField({
        description: new StringField({}),
        harmonique: new StringField({
          required: true,
          nullable: false,
          initial: SYSTEM.HARMONIQUES.ame.id,
          choices: SYSTEM.HARMONIQUES,
        }),
        prerequis: new StringField({}),
        niveau: new NumberField({ ...requiredInteger, initial: 1, min: 1, max: 5 }),
      }),
    )

    return schema
  }

  /**
   * Helper pour créer le schéma d'une complication
   */
  static createComplication() {
    return {
      description: new StringField({
        required: true,
        nullable: false,
        blank: true,
      }),
      valeur: new NumberField({
        required: true,
        nullable: false,
        initial: 0,
        min: 0,
        max: 3,
      }),
    }
  }

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

    // Initialisation des jetons de conscience
    if (this.conscience.jetons.length === 0) {
      this.conscience.jetons = Array.from({ length: this.conscience.max }, () => ({ statut: SYSTEM.JETON_STATUTS.inactif.id }))
    } else if (this.conscience.jetons.length < this.conscience.max) {
      const missingJetons = this.conscience.max - this.conscience.jetons.length
      this.conscience.jetons.push(...Array.from({ length: missingJetons }, () => ({ statut: SYSTEM.JETON_STATUTS.inactif.id })))
    } else if (this.conscience.jetons.length > this.conscience.max) {
      this.conscience.jetons = this.conscience.jetons.slice(0, this.conscience.max)
    }
  }
}
