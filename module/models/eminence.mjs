import { SYSTEM } from "../config/system.mjs"
import * as conscience from "../regles/conscience.mjs"

const { SchemaField, NumberField, StringField, ArrayField, BooleanField } = foundry.data.fields

export default class Eminence extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Eminence"]

  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    // Personnage
    schema.description = new StringField({})
    schema.peuple = new StringField({ required: true, nullable: false, initial: SYSTEM.PEUPLES.ameAccouchee.id, choices: SYSTEM.PEUPLES })
    schema.cle = new StringField({ required: true, nullable: false, initial: SYSTEM.HARMONIQUES.ame.id, choices: SYSTEM.HARMONIQUES })
    schema.gamme = new StringField({ required: true, nullable: false, initial: SYSTEM.GAMMES.diamantin.id, choices: SYSTEM.GAMMES })
    schema.ton = new StringField({ required: true, nullable: false, initial: SYSTEM.TONS.cassandre.id, choices: SYSTEM.TONS })
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
        max: 25,
      }),
      jetons: new ArrayField(
        new SchemaField({
          statut: new StringField({
            required: true,
            nullable: false,
            choices: SYSTEM.JETON_STATUTS,
          }),
        }),
        {
          initial: () => {
            let initJetons = Array.from({ length: 7 }, () => ({ statut: SYSTEM.JETON_STATUTS.actif.id }))
            initJetons.push(...Array.from({ length: 18 }, () => ({ statut: SYSTEM.JETON_STATUTS.perdu.id })))
            return initJetons
          },
        },
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
      cle: new BooleanField({ initial: false }),
      note1: new BooleanField({ initial: false }),
      note2: new BooleanField({ initial: false }),
      note3: new BooleanField({ initial: false }),
      note4: new BooleanField({ initial: false }),
    })

    // Pouvoirs, atouts et maîtrises magiques : objets intégrés

    return schema
  }

  static getGammeForPeuple(peuple) {
    switch (peuple) {
      case SYSTEM.PEUPLES.gnome.id:
      case SYSTEM.PEUPLES.nain.id:
      case SYSTEM.PEUPLES.centaure.id:
        return SYSTEM.GAMMES.auberon.id
      case SYSTEM.PEUPLES.meduse.id:
      case SYSTEM.PEUPLES.satyre.id:
      case SYSTEM.PEUPLES.minotaure.id:
        return SYSTEM.GAMMES.horla.id
      case SYSTEM.PEUPLES.ameAccouchee.id:
      case SYSTEM.PEUPLES.opalinDeLaRomance.id:
      case SYSTEM.PEUPLES.danseurAffranchi.id:
        return SYSTEM.GAMMES.diamantin.id
      case SYSTEM.PEUPLES.banshee.id:
      case SYSTEM.PEUPLES.feeNoire.id:
      case SYSTEM.PEUPLES.sirene.id:
        return SYSTEM.GAMMES.melusine.id
      case SYSTEM.PEUPLES.humain.id:
      case SYSTEM.PEUPLES.ogre.id:
      case SYSTEM.PEUPLES.geant.id:
        return SYSTEM.GAMMES.grangousier.id
    }
  }

  static getTonForPeuple(peuple) {
    switch (peuple) {
      case SYSTEM.PEUPLES.banshee.id:
      case SYSTEM.PEUPLES.centaure.id:
      case SYSTEM.PEUPLES.minotaure.id:
      case SYSTEM.PEUPLES.ogre.id:
      case SYSTEM.PEUPLES.opalinDeLaRomance.id:
        return SYSTEM.TONS.capitan.id
      case SYSTEM.PEUPLES.danseurAffranchi.id:
      case SYSTEM.PEUPLES.geant.id:
      case SYSTEM.PEUPLES.gnome.id:
      case SYSTEM.PEUPLES.satyre.id:
      case SYSTEM.PEUPLES.sirene.id:
        return SYSTEM.TONS.mascarille.id
      case SYSTEM.PEUPLES.ameAccouchee.id:
      case SYSTEM.PEUPLES.feeNoire.id:
      case SYSTEM.PEUPLES.humain.id:
      case SYSTEM.PEUPLES.meduse.id:
      case SYSTEM.PEUPLES.nain.id:
        return SYSTEM.TONS.cassandre.id
    }
  }

  /** @override */
  static migrateData(source) {
    if (source.peuple && !source.gamme) {
      source.gamme = Eminence.getGammeForPeuple(source.peuple)
    }
    if (source.peuple && !source.ton) {
      source.ton = Eminence.getTonForPeuple(source.peuple)
    }
    return super.migrateData(source)
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

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    // Mise à jour du token prototype pour qu'il soit lié à l'acteur et ait la vision activée
    const updates = {
      prototypeToken: {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        sight: {
          enabled: true,
          visionMode: "basic",
        },
      },
    }
    this.parent.updateSource(updates)
  }

  /** @override */
  async _preUpdate(changed, options, user) {
    if (foundry.utils.hasProperty(changed, "system.peuple") && changed.system.peuple !== this.peuple) {
      foundry.utils.setProperty(changed, "system.gamme", Eminence.getGammeForPeuple(changed.system.peuple))
      foundry.utils.setProperty(changed, "system.ton", Eminence.getTonForPeuple(changed.system.peuple))
    }
    if (foundry.utils.hasProperty(changed, "system.conscience.max")) {
      // Si le nouveau max est inférieur à l'ancien max, il faut remettre tous les jetons intermédiaires au statut perdu
      if (changed.system.conscience.max < this.conscience.max) {
        const jetons = foundry.utils.duplicate(this.conscience.jetons)
        for (let i = changed.system.conscience.max; i <= this.conscience.max && i < jetons.length; i++) {
          jetons[i].statut = SYSTEM.JETON_STATUTS.perdu.id
        }
        foundry.utils.setProperty(changed, "system.conscience.jetons", jetons)
      }
      // Si la valeur de conscience est supérieure à la nouvelle valeur max, on la met à jour
      if (this.conscience.valeur > changed.system.conscience.max) {
        foundry.utils.setProperty(changed, "system.conscience.valeur", changed.system.conscience.max)
      }
    }
    return super._preUpdate(changed, options, user)
  }

  get nbJetonsRestants() {
    return conscience.nbJetonsDisponibles(this.conscience.jetons)
  }

  // #region Jetons de conscience
  // Les règles sont dans regles/conscience.mjs ; ces méthodes les appliquent puis enregistrent l'Éminence.

  /**
   * Dépense des jetons de conscience, tout ou rien.
   * @param {number} nbJetons
   * @returns {Promise<boolean>} Faux s'il ne reste pas assez de jetons disponibles (rien n'est dépensé)
   */
  async depenserJetons(nbJetons) {
    const jetons = conscience.depenser(this.conscience.jetons, nbJetons)
    if (!jetons) return false
    if (nbJetons > 0) await this.parent.update({ "system.conscience.jetons": jetons })
    return true
  }

  /**
   * Envolée : le premier jeton dépensé redevient disponible.
   * @returns {Promise<boolean>} Faux s'il n'y a aucun jeton dépensé
   */
  async regagnerUnJeton() {
    const jetons = conscience.regagner(this.conscience.jetons)
    if (!jetons) return false
    await this.parent.update({ "system.conscience.jetons": jetons })
    return true
  }

  /**
   * Clic sur un jeton de la fiche : un jeton disponible est dépensé, un jeton dépensé redevient disponible.
   * @param {number} index
   * @returns {Promise<void>}
   */
  async basculerJeton(index) {
    const jetons = conscience.basculer(this.conscience.jetons, index)
    if (jetons) await this.parent.update({ "system.conscience.jetons": jetons })
  }

  /**
   * La conscience augmente de 1 : le premier jeton perdu revient, dépensé, dans la limite du maximum.
   * @returns {Promise<boolean>} Faux si la conscience est déjà au maximum
   */
  async ajouterUnJeton() {
    const resultat = conscience.ajouter(this.conscience.jetons, this.conscience.valeur, this.conscience.max)
    if (!resultat) return false
    await this.parent.update({ "system.conscience.valeur": resultat.valeur, "system.conscience.jetons": resultat.jetons })
    return true
  }

  /**
   * Perte d'un jeton précis : il passe au statut perdu, en fin de tableau, et la conscience diminue de 1.
   * @param {number} index
   * @returns {Promise<boolean>} Faux si ce jeton est déjà perdu
   */
  async perdreJeton(index) {
    const resultat = conscience.perdre(this.conscience.jetons, this.conscience.valeur, index)
    if (!resultat) return false
    await this.parent.update({ "system.conscience.valeur": resultat.valeur, "system.conscience.jetons": resultat.jetons })
    return true
  }

  /**
   * Fausse note : perte d'un jeton, en privilégiant un jeton dépensé, sinon un jeton disponible.
   * @returns {Promise<boolean>} Faux s'il n'y avait plus aucun jeton à perdre
   */
  async perdreUnJeton() {
    const index = conscience.indexJetonAPerdre(this.conscience.jetons)
    if (index === -1) return false
    return this.perdreJeton(index)
  }

  // #endregion Jetons de conscience
}
