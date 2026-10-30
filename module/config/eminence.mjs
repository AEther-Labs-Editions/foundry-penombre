export const HARMONIQUES = Object.freeze({
  ame: {
    id: "ame",
    label: "PENOMBRE.Harmonique.ame.label",
  },
  esprit: {
    id: "esprit",
    label: "PENOMBRE.Harmonique.esprit.label",
  },
  etincelle: {
    id: "etincelle",
    label: "PENOMBRE.Harmonique.etincelle.label",
  },
  nature: {
    id: "nature",
    label: "PENOMBRE.Harmonique.nature.label",
  },
  nuit: {
    id: "nuit",
    label: "PENOMBRE.Harmonique.nuit.label",
  },
})

/**
 * Disposition des harmoniques sur la fiche d'éminence, dans l'ordre de lecture, reprise de la fiche du livre (p. 373) :
 * Nuit et Âme en haut, Nature et Esprit plus écartés, Étincelle centrée en bas, chaque nom sous son dé.
 * Centres des cercles des dés mesurés sur la fiche du livre (bloc de 689 × 594 px), ramenés à la section de la fiche
 * (× 0,653 en largeur, × 0,589 en hauteur), moins le libellé et la frise (43 px) et la moitié du dé (42,5 px),
 * le tout décalé de 20 px vers la gauche à la demande (ornement compris).
 * - action : clé de localisation de l'infobulle (type d'action associé)
 * - x, y : position du coin haut gauche du dé dans la zone des dés, en px
 */
export const HARMONIQUES_FICHE = Object.freeze([
  { id: "nuit", action: "PENOMBRE.ui.actionScelerate", x: 91, y: 19 },
  { id: "ame", action: "PENOMBRE.ui.actionSociale", x: 230, y: 19 },
  { id: "nature", action: "PENOMBRE.ui.actionPhysique", x: 43, y: 147 },
  { id: "esprit", action: "PENOMBRE.ui.actionMentale", x: 269, y: 147 },
  { id: "etincelle", action: "PENOMBRE.ui.actionPerceptive", x: 156, y: 215 },
])

export const PEUPLES = Object.freeze({
  ameAccouchee: {
    id: "ameAccouchee",
    label: "PENOMBRE.Peuple.ameAccouchee.label",
  },
  banshee: {
    id: "banshee",
    label: "PENOMBRE.Peuple.banshee.label",
  },
  centaure: {
    id: "centaure",
    label: "PENOMBRE.Peuple.centaure.label",
  },
  danseurAffranchi: {
    id: "danseurAffranchi",
    label: "PENOMBRE.Peuple.danseurAffranchi.label",
  },
  feeNoire: {
    id: "feeNoire",
    label: "PENOMBRE.Peuple.feeNoire.label",
  },
  geant: {
    id: "geant",
    label: "PENOMBRE.Peuple.geant.label",
  },
  gnome: {
    id: "gnome",
    label: "PENOMBRE.Peuple.gnome.label",
  },
  humain: {
    id: "humain",
    label: "PENOMBRE.Peuple.humain.label",
  },
  meduse: {
    id: "meduse",
    label: "PENOMBRE.Peuple.meduse.label",
  },
  minotaure: {
    id: "minotaure",
    label: "PENOMBRE.Peuple.minotaure.label",
  },
  nain: {
    id: "nain",
    label: "PENOMBRE.Peuple.nain.label",
  },
  ogre: {
    id: "ogre",
    label: "PENOMBRE.Peuple.ogre.label",
  },
  opalinDeLaRomance: {
    id: "opalinDeLaRomance",
    label: "PENOMBRE.Peuple.opalinDeLaRomance.label",
  },
  satyre: {
    id: "satyre",
    label: "PENOMBRE.Peuple.satyre.label",
  },
  sirene: {
    id: "sirene",
    label: "PENOMBRE.Peuple.sirene.label",
  },
})

export const GAMMES = Object.freeze({
  auberon: {
    id: "auberon",
    label: "PENOMBRE.Gamme.auberon.label",
  },
  diamantin: {
    id: "diamantin",
    label: "PENOMBRE.Gamme.diamantin.label",
  },
  grangousier: {
    id: "grangousier",
    label: "PENOMBRE.Gamme.grangousier.label",
  },
  horla: {
    id: "horla",
    label: "PENOMBRE.Gamme.horla.label",
  },
  melusine: {
    id: "melusine",
    label: "PENOMBRE.Gamme.melusine.label",
  },
})

export const TONS = Object.freeze({
  capitan: {
    id: "capitan",
    label: "PENOMBRE.Ton.capitan.label",
  },
  cassandre: {
    id: "cassandre",
    label: "PENOMBRE.Ton.cassandre.label",
  },
  mascarille: {
    id: "mascarille",
    label: "PENOMBRE.Ton.mascarille.label",
  },
})

export const TIMBRES = Object.freeze({
  harmonieux: {
    id: "harmonieux",
    label: "PENOMBRE.Timbre.harmonieux.label",
  },
  faux: {
    id: "faux",
    label: "PENOMBRE.Timbre.faux.label",
  },
  dissonant: {
    id: "dissonant",
    label: "PENOMBRE.Timbre.dissonant.label",
  },
})
