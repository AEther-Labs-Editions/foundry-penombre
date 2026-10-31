const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api

/**
 * Fenêtre indépendante affichant le rappel des règles de la fiche d'éminence (dépenses de jetons, résultats et succès).
 * Ouverte depuis le menu Pénombre de la barre latérale, pour tous les utilisateurs.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class PenombreRappelRegles extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: "penombre-rappel-regles",
    classes: ["penombre", "rappel-regles"],
    window: {
      title: "PENOMBRE.RappelRegles.title",
      icon: "fa-solid fa-scroll",
      resizable: false,
    },
    position: {
      width: 680,
      height: "auto",
    },
  }

  /** @override */
  static PARTS = {
    main: {
      template: "systems/penombre/templates/rappel-regles.hbs",
    },
  }

  /** Ouvre la fenêtre, ou la ramène au premier plan si elle est déjà ouverte */
  static ouvrir() {
    const existante = foundry.applications.instances.get(PenombreRappelRegles.DEFAULT_OPTIONS.id)
    if (existante) existante.bringToFront()
    else new PenombreRappelRegles().render({ force: true })
  }
}
