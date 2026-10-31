import { SYSTEM, systemPath } from "../../config/system.mjs"
import PenombreBaseActorSheet from "./base-actor-sheet.mjs"

export default class EminenceSheet extends PenombreBaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["eminence"],
    window: {
      contentClasses: ["eminence-content"],
    },
    actions: {
      jeton: EminenceSheet.#onClicJeton,
      complication: EminenceSheet.#onClicComplication,
      create: EminenceSheet.#onCreateItem,
      jetHarmonique: EminenceSheet.#onClicHarmonique,
      note: EminenceSheet.#onClicNote,
      statut: EminenceSheet.#onClicStatut,
      utilisePouvoir: EminenceSheet.#onClicPouvoirCoche,
    },
  }

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/eminence/eminence.hbs",
      templates: ["_potentiel.hbs", "atouts.hbs", "conscience.hbs", "harmoniques.hbs", "maitrises.hbs", "personnage.hbs", "pouvoirs.hbs", "recapitulatif.hbs", "timbre.hbs"].map((t) =>
        systemPath(`templates/eminence/partials/${t}`),
      ),
      scrollable: [""],
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    // Harmoniques dans l'ordre de lecture de la fiche, avec tout ce dont le gabarit a besoin
    const harmoniques = this.document.system._source.harmoniques
    context.harmoniques = SYSTEM.HARMONIQUES_FICHE.map(({ id, action, x, y }) => ({
      id,
      label: game.i18n.localize(`PENOMBRE.ui.${id}`),
      tooltip: game.i18n.localize(action),
      valeur: harmoniques[id].valeur,
      name: `system.harmoniques.${id}.valeur`,
      x,
      y,
    }))

    context.jetons = this.document.system.conscience.jetons.slice(0, this.document.system.conscience.max)
    context.nbJetonsRestantsConscience = this.document.system.nbJetonsRestants

    const styleJeu = game.settings.get(SYSTEM.ID, "styleJeu")
    context.isStyleJeuDemo = styleJeu === "demo"
    context.isStyleJeuStandard = styleJeu === "standard"
    context.isStyleJeuAvance = styleJeu === "avance"
    context.afficherRecapitulatif = game.settings.get(SYSTEM.ID, "afficherRecapitulatif")

    context.pouvoirs = this.document.itemTypes.pouvoir
    const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML
    // Infobulle des pouvoirs : carte dans le style de celle des maîtrises (nom et type, citation, effet)
    for (const pouvoir of context.pouvoirs) {
      const nom = foundry.utils.escapeHTML(pouvoir.name)
      const type = game.i18n.localize(`PENOMBRE.Pouvoir.type.${pouvoir.system.type}.label`)
      const entete = `<p class="infobulle-entete"><span class="infobulle-nom">${nom}</span> <span class="infobulle-source">${type}</span></p>`
      const citation = pouvoir.system.citation ? `<p class="pouvoir-citation">${pouvoir.system.citation}</p>` : ""
      const description = pouvoir.system.description ?? ""
      pouvoir.enrichedTooltip = await enrichHTML(`<div class="pouvoir-carte">${entete}${citation}${description}</div>`)
    }
    context.atouts = this.document.itemTypes.atout
    context.maitrises = this.document.itemTypes.maitrise
    // Infobulle des maîtrises : même en-tête que celle des pouvoirs (nom, et l'harmonique en haut à droite), puis la carte
    for (const maitrise of context.maitrises) {
      const nom = foundry.utils.escapeHTML(maitrise.name)
      const harmonique = game.i18n.localize(`PENOMBRE.Harmonique.${maitrise.system.harmonique}.label`)
      const entete = `<p class="infobulle-entete"><span class="infobulle-nom">${nom}</span> <span class="infobulle-source">${harmonique}</span></p>`
      maitrise.infobulle = `${entete}${maitrise.system.description ?? ""}`
    }

    context.hasAtouts = this.document.system.hasAtouts

    // Select options
    context.harmoniqueValueChoices = { d4: "D4", d6: "D6", d8: "D8", d10: "D10", d12: "D12" }
    context.potentielChoices = Object.fromEntries(Array.from({ length: SYSTEM.POTENTIEL_MAX }, (_, i) => [i, i]))

    if (CONFIG.debug.penombre?.sheets) console.debug("Pénombre | EminenceSheet | prepareContext", context)
    return context
  }

  /**
   * Actions performed after a first render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options)
    this._createContextMenus()
  }

  /* Right-click context menus */
  _createContextMenus() {
    /** @fires {hookEvents:_getItemEntryContextOptions} */
    this._createContextMenu(this._getJetonConscienceContextOptions, ".jeton-contextmenu", {
      fixed: true,
      hookName: "JetonEntryContext",
      parentClassHooks: false,
    })
  }

  /** * Get the context options for the jeton conscience.
   * @returns {ContextMenuEntry[]} An array of context menu entries.
   * @private
   */
  _getJetonConscienceContextOptions() {
    return [
      {
        label: `Ajouter / Perdre un jeton de conscience`,
        icon: `<i class="fa-regular fa-bolt"></i>`,
        onClick: async (event, li) => {
          event.preventDefault()
          const index = li.dataset.index
          let jetons = foundry.utils.duplicate(this.document.system.conscience.jetons)
          const currentStatut = jetons[index].statut
          let currentConscience = this.document.system.conscience.valeur
          switch (currentStatut) {
            case "actif":
            case "inactif":
              const jetonSupprime = jetons.splice(index, 1)[0]
              jetonSupprime.statut = "perdu"
              jetons.push(jetonSupprime)
              currentConscience--
              break
            case "perdu":
              jetons[currentConscience].statut = "inactif"
              currentConscience++
              break
          }
          await this.document.update({ "system.conscience.jetons": jetons, "system.conscience.valeur": currentConscience })
        },
      },
    ]
  }

  /** @override */
  _onDragStart(event) {
    const target = event.currentTarget
    let dragData

    if (target.classList.contains("jetHarmonique")) {
      const type = "penombre.harmonique"
      const harmonique = target.dataset.harmonique
      let valeur = this.actor.system.harmoniques[harmonique].valeur
      dragData = {
        type,
        actorName: this.actor.name,
        actorId: this.actor.id,
        harmonique,
        valeur,
      }
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
    }
    // Sinon dataset contient itemUuid, itemId, itemType
    else super._onDragStart(event)
  }

  /**
   * Handle clicking on Document's elements.
   * @param {Event} event The click event triggered by the user.
   * @param {HTMLElement} target The HTML element that was clicked, containing dataset information.
   * @returns {Promise<void>}
   **/
  static async #onClicJeton(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const index = dataset.index // Commence à 0
    const jetons = foundry.utils.duplicate(this.document.system.conscience.jetons)
    const currentStatut = jetons[index].statut
    switch (currentStatut) {
      case "actif":
        jetons[index].statut = "inactif"
        break
      case "inactif":
        jetons[index].statut = "actif"
        break
    }
    await this.document.update({ "system.conscience.jetons": jetons })
  }

  static async #onClicNote(event, target) {
    event.preventDefault()
    const noteKeys = ["cle", "note1", "note2", "note3", "note4"]
    const key = noteKeys[target.dataset.index]
    if (key) {
      await this.document.update({ [`system.timbre.${key}`]: !this.document.system.timbre[key] })
    }
  }

  /**
   * Gère le clic pour cocher/décocher l'utilisation d'un pouvoir.
   *
   * @param {Event} event L'événement de clic déclenché par l'utilisateur.
   * @param {HTMLElement} target L'élément HTML cliqué, contenant les attributs data.
   * @returns {Promise<void>} Résout lorsque la mise à jour du pouvoir est terminée.
   * @private
   * @static
   */
  static async #onClicPouvoirCoche(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const id = dataset.itemId
    const pouvoir = this.document.items.get(id)
    await pouvoir.update({ "system.utilise": !pouvoir.system.utilise })
  }

  /**
   * Gère les clics sur les éléments de complication dans l'interface.
   *
   * @param {Event} event L'événement de clic déclenché par l'utilisateur.
   * @param {HTMLElement} target L'élément HTML cliqué, contenant les attributs data de la complication.
   * @returns {Promise<void>} Résout lorsque la mise à jour du document est terminée.
   * @private
   * @static
   */
  static async #onClicComplication(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const complication = dataset.complication
    let index = parseInt(dataset.index)
    const initialValue = this.document.system.conscience.complications[complication].valeur
    if (initialValue === 1 && index === 1) index = 0 // Si on clique sur la première case, on la désactive
    if (initialValue === 2 && index === 2) index = 1
    if (initialValue === 3 && index === 3) index = 2
    await this.document.update({ [`system.conscience.complications.${complication}.valeur`]: index })
  }

  static async #onClicStatut(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    let index = dataset.index
    await this.document.update({ [`system.timbre.statut`]: index })
  }

  static async #onClicHarmonique(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const harmonique = dataset.harmonique
    await this.actor.rollHarmonique({ harmonique })
  }

  static async #onCreateItem(event, target) {
    event.preventDefault()
    const type = target.dataset.type

    const itemData = {
      type: type,
    }
    if (type === "pouvoir") {
      itemData.name = game.i18n.localize("PENOMBRE.ui.pouvoirNew")
    } else if (type === "atout") {
      itemData.name = game.i18n.localize("PENOMBRE.ui.atoutNew")
    } else if (type === "maitrise") {
      itemData.name = game.i18n.localize("PENOMBRE.ui.maitriseNew")
    }

    return await this.actor.createEmbeddedDocuments("Item", [itemData])
  }
}
