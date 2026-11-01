/**
 * Clic droit sur l'image d'une fiche : après confirmation, l'image redevient celle par défaut du type de document.
 * Sans effet si la fiche n'est pas modifiable.
 * @param {foundry.applications.api.DocumentSheetV2} sheet
 */
export function activerImageParDefaut(sheet) {
  const image = sheet.element.querySelector("[data-action='editImage']")
  if (!image) return
  image.addEventListener("contextmenu", async (event) => {
    event.preventDefault()
    if (!sheet.isEditable) return
    const confirme = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("PENOMBRE.ui.imageParDefaut") },
      content: `<p>${game.i18n.localize("PENOMBRE.ui.imageParDefautConfirmation")}</p>`,
    })
    if (!confirme) return
    const { img } = sheet.document.constructor.getDefaultArtwork(sheet.document.toObject())
    await sheet.document.update({ img })
  })
}
