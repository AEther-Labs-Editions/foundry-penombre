/**
 * Règles des jets de Pénombre en fonctions pures : elles ne lisent ni la fenêtre de jet, ni les documents de
 * Foundry, et peuvent être testées sans Foundry (tests/unit).
 */

/** Un succès par tranche de 4 sur chaque dé */
export const SUCCESS_DIVISOR = 4

/** Nombre de faces du dé merveilleux */
export const MERVEILLEUX_FACES = 20

/**
 * Coût en jetons d'un jet, d'après les options choisies dans la fenêtre de jet.
 *
 * Le premier atout est gratuit pour un jet simple, et pour une action collégiale (principale ou liée) seulement
 * si la case « Premier atout » est cochée. Le jeton d'un atout de faction doit venir de la réserve collégiale ;
 * le premier atout gratuit est attribué de préférence à un atout personnel.
 *
 * @param {object} options
 * @param {boolean} [options.actionCollegiale] Case « Action collégiale » cochée (message principal)
 * @param {boolean} [options.messageLie] Le jet est un message lié à une action collégiale
 * @param {boolean} [options.actionCollegialeLiee] La case « Action collégiale » est absente (jet lié)
 * @param {boolean} [options.premierAtoutCoche] Case « Premier atout pour action collégiale » cochée
 * @param {number} [options.nbAtouts] Nombre d'atouts cochés, atouts de faction compris
 * @param {number} [options.nbFactionAtouts] Nombre d'atouts de faction cochés
 * @param {boolean} [options.deMerveilleux] Dé merveilleux ajouté
 * @param {boolean} [options.effetMagique] Effet magique produit
 * @param {number} [options.niveauEffetMagique] Niveau de l'effet magique souhaité
 * @param {number} [options.niveauMaitrise] Niveau de la maîtrise utilisée
 * @returns {{premierAtoutGratuit: boolean, jetonsAtouts: number, jetonActionCollegiale: number, jetonDeMerveilleux: number, jetonEffetMagique: number, jetonsEffetMagiqueMaitrise: number, total: number, jetonsReserveMinimum: number}}
 */
export function calculerCoutJetons({
  actionCollegiale = false,
  messageLie = false,
  actionCollegialeLiee = false,
  premierAtoutCoche = false,
  nbAtouts = 0,
  nbFactionAtouts = 0,
  deMerveilleux = false,
  effetMagique = false,
  niveauEffetMagique = 1,
  niveauMaitrise = 0,
} = {}) {
  const jetonActionCollegiale = actionCollegiale && !messageLie ? 1 : 0

  const premierAtoutGratuit =
    (actionCollegiale && premierAtoutCoche) || (!actionCollegiale && !actionCollegialeLiee) || (!actionCollegiale && actionCollegialeLiee && premierAtoutCoche)
  const jetonsAtouts = premierAtoutGratuit ? Math.max(nbAtouts - 1, 0) : nbAtouts

  const nbAtoutsPersonnels = nbAtouts - nbFactionAtouts
  let jetonsReserveMinimum = nbFactionAtouts
  if (premierAtoutGratuit && nbAtoutsPersonnels === 0 && nbFactionAtouts > 0) jetonsReserveMinimum = nbFactionAtouts - 1

  const jetonDeMerveilleux = deMerveilleux ? 1 : 0
  const jetonEffetMagique = effetMagique ? 1 : 0
  const jetonsEffetMagiqueMaitrise = effetMagique ? Math.max(niveauEffetMagique - niveauMaitrise, 0) : 0

  const total = jetonsAtouts + jetonActionCollegiale + jetonDeMerveilleux + jetonEffetMagique + jetonsEffetMagiqueMaitrise
  return { premierAtoutGratuit, jetonsAtouts, jetonActionCollegiale, jetonDeMerveilleux, jetonEffetMagique, jetonsEffetMagiqueMaitrise, total, jetonsReserveMinimum }
}

/**
 * Jetons restant à répartir entre la conscience et la réserve, une fois déduits ceux couverts par la complication.
 * @param {number} total Coût total du jet
 * @param {number} jetonsComplication Jetons couverts par la complication
 * @returns {number}
 */
export function jetonsARepartir(total, jetonsComplication) {
  return Math.max(total - jetonsComplication, 0)
}

/**
 * Jetons devant encore venir de la réserve collégiale pour les atouts de faction, une fois déduits ceux couverts par
 * la complication. Une complication (individuelle ou collégiale) peut remplacer n'importe quel jeton à dépenser,
 * y compris celui d'un atout collégial (livre 2, p. 90) : elle couvre en priorité ces jetons, ce qui laisse le
 * reste du coût libre entre conscience et réserve.
 * @param {number} minimum Jetons de la réserve imposés par les atouts de faction (voir calculerCoutJetons)
 * @param {number} jetonsComplication Jetons couverts par la complication
 * @returns {number}
 */
export function jetonsReserveMinimum(minimum, jetonsComplication) {
  return Math.max(minimum - jetonsComplication, 0)
}

/**
 * Raisons d'empêcher le lancer, d'après la répartition des jetons demandée.
 *
 * Codes renvoyés :
 * - `depassement` : plus de jetons répartis que nécessaire (avertissement, inclus dans `repartition`)
 * - `repartition` : les jetons répartis ne correspondent pas au coût à payer
 * - `acteur` : l'acteur est introuvable
 * - `conscience` : plus de jetons de conscience demandés qu'il n'en reste
 * - `reserve` : plus de jetons de la réserve demandés qu'il n'en reste
 * - `minimumReserve` : pas assez de jetons de la réserve pour les atouts de faction
 * - `description` : complication sans description
 *
 * @param {object} options
 * @param {number} options.jetonsConscience Jetons de conscience demandés
 * @param {number} options.jetonsReserve Jetons de la réserve demandés
 * @param {number} options.aRepartir Jetons à répartir (voir jetonsARepartir)
 * @param {number|null} options.dispoConscience Jetons de conscience disponibles, null si l'acteur est introuvable
 * @param {number} options.dispoReserve Jetons disponibles dans la réserve (0 sans MJ connecté)
 * @param {number} [options.minimumReserve] Jetons de la réserve imposés par les atouts de faction
 * @param {boolean} [options.descriptionManquante] Complication cochée sans description
 * @returns {{possible: boolean, erreurs: string[]}}
 */
export function verifierRepartition({ jetonsConscience, jetonsReserve, aRepartir, dispoConscience, dispoReserve, minimumReserve = 0, descriptionManquante = false }) {
  const erreurs = []
  const repartis = jetonsConscience + jetonsReserve
  if (repartis > aRepartir) erreurs.push("depassement")
  if (repartis !== aRepartir) erreurs.push("repartition")
  if (dispoConscience === null) erreurs.push("acteur")
  else if (jetonsConscience > dispoConscience) erreurs.push("conscience")
  if (jetonsReserve > dispoReserve) erreurs.push("reserve")
  if (jetonsReserve < minimumReserve) erreurs.push("minimumReserve")
  if (descriptionManquante) erreurs.push("description")
  return { possible: erreurs.length === 0, erreurs }
}

/**
 * Analyse des dés d'un jet : succès et événements du premier dé (dé d'harmonique, ou dé merveilleux s'il est seul)
 * et du dé merveilleux ajouté.
 * @param {Array<{faces: number, total: number, results: Array<{result: number}>}>} des Dés du jet (roll.dice)
 * @returns {{nbSucces: number, typeDeHarmonique: number|null, isDeHarmoniqueMin: boolean, isDeHarmoniqueMax: boolean, isDeMerveilleuxMin: boolean, isDeMerveilleuxMax: boolean}}
 */
export function analyserDes(des) {
  let nbSucces = 0
  let isDeHarmoniqueMin = false
  let isDeHarmoniqueMax = false
  let isDeMerveilleuxMin = false
  let isDeMerveilleuxMax = false
  let typeDeHarmonique = null

  for (const [index, de] of des.entries()) {
    const isMerveilleux = de.faces === MERVEILLEUX_FACES
    // Premier dé : dé d'harmonique, ou dé merveilleux
    if (index === 0) {
      typeDeHarmonique = de.faces
      if (de.total === de.faces) {
        if (isMerveilleux) isDeMerveilleuxMax = true
        else isDeHarmoniqueMax = true
      }
      if (de.total === 1) {
        if (isMerveilleux) isDeMerveilleuxMin = true
        else isDeHarmoniqueMin = true
      }
    }
    // Les autres dés : dé merveilleux ou dés d'atouts
    else if (isMerveilleux) {
      if (de.total === de.faces) isDeMerveilleuxMax = true
      if (de.total === 1) isDeMerveilleuxMin = true
    }

    for (const result of de.results) nbSucces += Math.floor(result.result / SUCCESS_DIVISOR)
  }

  return { nbSucces, typeDeHarmonique, isDeHarmoniqueMin, isDeHarmoniqueMax, isDeMerveilleuxMin, isDeMerveilleuxMax }
}
