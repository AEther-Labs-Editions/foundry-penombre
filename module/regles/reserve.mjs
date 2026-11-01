/**
 * Règles des jetons de la réserve collégiale en fonctions pures, testables sans Foundry (tests/unit).
 * Les jetons sont un objet { "1": { valeur }, "2": { valeur }, … } ; valeur vaut vrai pour un jeton disponible.
 */

/**
 * @typedef {Record<string, {valeur: boolean}>} JetonsReserve
 */

/**
 * @param {JetonsReserve} jetons
 * @returns {number} Nombre de jetons disponibles
 */
export function nbJetonsDisponibles(jetons) {
  return Object.values(jetons).filter((jeton) => jeton.valeur === true).length
}

/**
 * Paiement tout ou rien : s'il ne reste pas assez de jetons, rien n'est pris.
 * @param {JetonsReserve} jetons
 * @param {number} nbJetons
 * @returns {{jetons: JetonsReserve, paye: boolean, restants: number}} Nouveaux jetons, paiement effectué, jetons disponibles avant paiement
 */
export function payer(jetons, nbJetons) {
  const restants = nbJetonsDisponibles(jetons)
  const nouveaux = Object.fromEntries(Object.entries(jetons).map(([cle, jeton]) => [cle, { ...jeton }]))
  if (restants < nbJetons) return { jetons: nouveaux, paye: false, restants }
  let reste = nbJetons
  for (const jeton of Object.values(nouveaux)) {
    if (reste === 0) break
    if (jeton.valeur === true) {
      jeton.valeur = false
      reste--
    }
  }
  return { jetons: nouveaux, paye: true, restants }
}

/**
 * Met la réserve à la taille voulue : jetons « 1 » à « nbJetons », les nouveaux non disponibles, les autres supprimés.
 * @param {JetonsReserve} jetons
 * @param {number} nbJetons
 * @returns {JetonsReserve}
 */
export function ajusterTaille(jetons, nbJetons) {
  const nouveaux = {}
  for (let i = 1; i <= nbJetons; i++) {
    const cle = String(i)
    nouveaux[cle] = jetons[cle] ? { ...jetons[cle] } : { valeur: false }
  }
  return nouveaux
}
