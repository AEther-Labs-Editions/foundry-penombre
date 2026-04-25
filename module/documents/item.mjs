export default class PenombreItem extends Item {
  /** @override */
  static getDefaultArtwork(itemData) {
    const defaultImages = {
      pouvoir: "systems/penombre/assets/icons/pouvoir.webp",
      atout: "systems/penombre/assets/icons/atout.webp",
      maitrise: "systems/penombre/assets/icons/maitrise.webp",
      action: "systems/penombre/assets/icons/action.webp",
      intrigue: "systems/penombre/assets/icons/intrigue.webp",
    }
    return { img: defaultImages[itemData.type] || "icons/svg/item-bag.svg" }
  }
}
