const { sheets } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api

import { SYSTEM, systemPath } from "../../config/system.mjs"

export default class EminenceSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /**
   * Different sheet modes.
   * @enum {number}
   */
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["penombre", "eminence"],
    position: {
      width: 1152,
      height: 780,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      contentClasses: ["eminence-content"],
      resizable: true,
    },
    actions: {
      editImage: EminenceSheet.#onEditImage,
      jeton: EminenceSheet.#onClicJeton,
      complication: EminenceSheet.#onClicComplication,
      clicDe: EminenceSheet.#onClicDe,
      edit: EminenceSheet.#onEditItem,
      read: EminenceSheet.#onReadItem,
      delete: EminenceSheet.#onDeleteItem,
      create: EminenceSheet.#onCreateItem
    },
  }

  /**
   * The current sheet mode.
   * @type {number}
   */
  _sheetMode = this.constructor.SHEET_MODES.PLAY

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/eminence/eminence.hbs",
      templates: ["atouts.hbs", "conscience.hbs", "harmoniques.hbs", "maitrises.hbs", "personnage.hbs", "pouvoirs.hbs", "recapitulatif.hbs", "timbre.hbs"].map((t) =>
        systemPath(`templates/eminence/partials/${t}`),
      ),
      scrollable: [""],
    },
  }

  /**
   * Is the sheet currently in 'Play' mode?
   * @type {boolean}
   */
  get isPlayMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.PLAY
  }

  /**
   * Is the sheet currently in 'Edit' mode?
   * @type {boolean}
   */
  get isEditMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.EDIT
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.systemSource = this.document.system._source
    context.document = this.document
    context.system = this.document.system

    context.ame = this.document.system._source.harmoniques.ame.valeur
    context.esprit = this.document.system._source.harmoniques.esprit.valeur
    context.etincelle = this.document.system._source.harmoniques.etincelle.valeur
    context.nature = this.document.system._source.harmoniques.nature.valeur
    context.nuit = this.document.system._source.harmoniques.nuit.valeur

    context.jetons = this.document.system.conscience.jetons.slice(0, this.document.system.conscience.max)

    context.unlocked = this.isEditMode
    context.locked = this.isPlayMode

    const styleJeu = game.settings.get("penombre", "styleJeu")
    context.isStyleJeuDemo = styleJeu === "demo"
    context.isStyleJeuStandard = styleJeu === "standard"
    context.isStyleJeuAvance = styleJeu === "avance"

    context.pouvoirs = this.document.itemTypes.pouvoir
    context.atouts = this.document.itemTypes.atout

    // Select options
    context.harmoniquesChoices = { d4: "D4", d6: "D6", d8: "D8", d10: "D10", d12: "D12" }
    context.potentielChoices = Object.fromEntries(Array.from({ length: SYSTEM.POTENTIEL_MAX }, (_, i) => [i, i]))

    console.log("EminenceSheet._prepareContext", context)
    return context
  }

  /* -------------------------------------------- */

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
        name: `Ajouter / Perdre un jeton de conscience`,
        icon: `<i class="fa-regular fa-bolt"></i>`,
        callback: (li) => {
          const index = li.dataset.index
          console.log(`EminenceSheet._getJetonConscienceContextOptions: index ${index}`)
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
          this.document.update({ "system.conscience.jetons": jetons, "system.conscience.valeur": currentConscience })
        },
      },
    ]
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    // Set toggle state and add status class to frame
    this._renderModeToggle(this.element)
  }

  /**
   * Manage the lock/unlock button on the sheet
   * @param {Event} event
   */
  async _onSheetChangeLock(event) {
    event.preventDefault()
    const modes = this.constructor.SHEET_MODES
    this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT
    await this.submit()
    this.render()
  }

  /**
   * Handle re-rendering the mode toggle on ownership changes.
   * @param {HTMLElement} element
   * @protected
   */
  _renderModeToggle(element) {
    const header = element.querySelector(".window-header")
    const toggle = header.querySelector(".mode-slider")
    if (this.isEditable && !toggle) {
      const toggle = document.createElement("penombre-toggle-switch")
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT
      toggle.classList.add("mode-slider")
      // TODO change tooltip with translation
      toggle.dataset.tooltip = "PENOMBRE.ui.modeEdition"
      toggle.dataset.tooltipDirection = "UP"
      toggle.setAttribute("aria-label", game.i18n.localize("PENOMBRE.ui.modeEdition"))
      toggle.addEventListener("change", this._onSheetChangeLock.bind(this))
      toggle.addEventListener("dblclick", (event) => event.stopPropagation())
      toggle.addEventListener("pointerdown", (event) => event.stopPropagation())
      header.prepend(toggle)
    } else if (this.isEditable) {
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT
    } else if (!this.isEditable && toggle) {
      toggle.remove()
    }
  }

  /**
   * Handle changing a Document's image.
   *
   * @this EminenceSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @private
   */
  static async #onEditImage(event, target) {
    const current = foundry.utils.getProperty(this.document, "img")
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {}
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ img: path })
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return fp.browse()
  }

  /**
   * Handle clicking on Document's elements.
   * @param event
   * @param target
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

    /**
   * Gère les clics sur les Dés dans l'interface.
   *
   * @param {Event} event L'événement de clic déclenché par l'utilisateur.
   * @param {HTMLElement} target L'élément HTML cliqué, contenant les attributs data du Dé.
   * @returns {Promise<void>} Résout lorsque la mise à jour du document est terminée.
   * @private
   * @static
   */
  static async #onClicDe(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const clicDe = dataset.clicDe
    let myActor = this.actor
    let myHarmonique = dataset.index
    let myDeHarmonique = "d20"
    switch (myHarmonique) {
      case 'ame': myDeHarmonique = await myActor.system.harmoniques.ame.valeur
        break;
      case 'esprit': myDeHarmonique = await myActor.system.harmoniques.esprit.valeur
        break;
      case 'etincelle': myDeHarmonique = await myActor.system.harmoniques.etincelle.valeur
        break;
      case 'nature': myDeHarmonique = await myActor.system.harmoniques.nature.valeur
        break;
      case 'nuit': myDeHarmonique = await myActor.system.harmoniques.nuit.valeur
        break;
      default: console.log('Désolé, il y a un problème.');
    }

    const myTypeOfThrow = game.settings.get("core", "rollMode"); // Type de Lancer
    let myRoll = ""
    var msg = ""

    // Affiche le prompt de lancer de dés
    let template = ""
    let myTitle = "" // game.i18n.localize("PENOMBRE.ThrowDice");
    let myDialogOptions = {}
    let promptLanceDes = await _promptV2LanceDes (myHarmonique, myDeHarmonique, template, myTitle, myDialogOptions)

    //////////////////////////////////////////////////////////////////
    if (!(promptLanceDes)) {
      ui.notifications.warn(game.i18n.localize("PENOMBRE.Error111"));
      return;
      };
    //////////////////////////////////////////////////////////////////


    // Récupère les données du prompt de lancer de dés
    myHarmonique = promptLanceDes.harmonique
    myDeHarmonique = promptLanceDes.deHarmonique
    let myListeBonus = promptLanceDes.listeBonus
    let myNbreJetons = promptLanceDes.nbreJetons

    let myNbreBonus = 0
    // Ici, on calcule les nombre de D6 bonus à partir de la liste de Bonus

    // Lance les Dés
    if (myNbreBonus == 0) {
      myRoll = "1"+myDeHarmonique
    } else {
      myRoll = "1"+myDeHarmonique+"+"+myNbreBonus.toString()+"d6"
    }
    console.log("myRoll = ", myRoll)
    let r = new Roll(myRoll, myActor.getRollData());
    await r.evaluate();

  
    msg = await r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: myActor }),
      rollMode: myTypeOfThrow
    });


    /*
    msg = await renderChatMessageHTML({ // Remplacera définitivement la commande précédente à partir de Foundry VTT v15

  
    })
    */

    if (game.modules.get("dice-so-nice")?.active) {
      await game.dice3d.waitFor3DAnimationByMessageID(msg.id);
    };

  }


  /**
   * Handle click events for Pouvoir, Atout within the Eminence Sheet
   *
   * @param {Event} event L'événement de clic déclenché par l'utilisateur.
   * @param {HTMLElement} target L'élément HTML cliqué, contenant les attributs data de la complication.
   * @returns {Promise<void>} Résout lorsque la mise à jour du document est terminée.
   * @private
   * @static
   */
  static async #onCreateItem(event, target) {
    event.preventDefault();

    // Obtain event data
    const dataset = target.dataset
    // const proceed = dataset.proceed
    const type = dataset.type

    let myActor = this.actor

    const button = target

    let item;

    // Handle different actions
    const cls = getDocumentClass("Item")
    let name = "";
    let imgPath = "";
    if (type === "pouvoir") {
      name = game.i18n.localize("PENOMBRE.ui.pouvoirNew");
      imgPath = "systems/penombre/images/icons/pouvoir.png";
    }
    else if (type === "atout") {
      name = game.i18n.localize("PENOMBRE.ui.atoutNew");
      imgPath = "systems/devastra/images/icons/atout.png";
    }
    

    await cls.create({ name: name, type: type }, { parent: myActor });

    const myType = type;
    switch (myType) {
      case "pouvoir":
        for (let item of myActor.items.filter(item => item.type === 'pouvoir')) {
          if (item.img == "icons/svg/item-bag.svg") item.update({ "img": imgPath });
        }
      break;
      case "atout":
        for (let enseignement of myActor.items.filter(item => item.type === 'atout')) {
          if (enseignement.img == "icons/svg/item-bag.svg") enseignement.update({ "img": imgPath });
        }
      break;
    }
  }

  static async #onReadItem(event, target) {
    event.preventDefault();

    // Obtain event data
    const dataset = target.dataset
    // const proceed = dataset.proceed
    const type = dataset.type
    const itemId = dataset.itemId

    let myActor = this.actor

    const button = target

    let item = myActor.items.get(itemId)
    console.log("item = ", item)
    return item.sheet.render(true)
  }


  static async #onDeleteItem(event, target) {
    event.preventDefault();

    // Obtain event data
    const dataset = target.dataset
    // const proceed = dataset.proceed
    const type = dataset.type
    const itemId = dataset.itemId

    let myActor = this.actor

    const button = target

    let item = myActor.items.get(itemId)
    console.log("item = ", item)
    return item.delete()
  }

  static async #onEditItem(event, target) {
    event.preventDefault()

    // Obtain event data
    const dataset = target.dataset
    // const proceed = dataset.proceed
    const type = dataset.type
    const itemId = dataset.itemId

    let myActor = this.actor

    const button = target


    console.log("myActor = ", myActor)
    let item = myActor.items.get(itemId)
    console.log("item = ", item)
    return item.sheet.render(true)
  }

}

// Gère le prompt de lancer de dés
async function _promptV2LanceDes(myHarmonique, myDeHarmonique, template, myTitle, myDialogOptions) {
  let promptLanceDes = {
    harmonique: myHarmonique,
    deHarmonique: myDeHarmonique,
    listeBonus: {},
    nbreJetons: 0
  }
  console.log("Je lance le prompt pour", myHarmonique, myDeHarmonique)
  return promptLanceDes
}