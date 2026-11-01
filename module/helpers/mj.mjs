/**
 * Échanges avec le MJ actif : toutes les écritures partagées (réserve collégiale, factions, participation
 * aux actions collégiales) sont faites chez lui, au moyen des requêtes déclarées dans CONFIG.queries.
 */

/**
 * Indique si un MJ est connecté pour traiter les écritures partagées.
 * @returns {boolean}
 */
export function mjConnecte() {
  return !!game.users.activeGM
}

/**
 * Fait exécuter une requête par le MJ actif.
 * Le MJ actif exécute directement le traitement, sans aller-retour réseau ; les autres utilisateurs envoient la requête.
 * Sans MJ connecté, ou si le traitement échoue, une notification est affichée et la demande échoue.
 * @param {string} nom Nom de la requête, déclarée dans CONFIG.queries
 * @param {object} [donnees] Données de la requête (sérialisables en JSON)
 * @returns {Promise<{ok: boolean, resultat?: *}>} ok vaut false si la demande n'a pas pu être traitée
 */
export async function demanderAuMJ(nom, donnees = {}) {
  const mj = game.users.activeGM
  if (!mj) {
    ui.notifications.warn("PENOMBRE.Warnings.mjAbsent", { localize: true })
    return { ok: false }
  }
  try {
    const resultat = mj.isSelf ? await CONFIG.queries[nom](donnees, { user: game.user }) : await mj.query(nom, donnees)
    return { ok: true, resultat }
  } catch (err) {
    console.error(`Pénombre | Requête ${nom} non traitée par le MJ`, err)
    ui.notifications.error(game.i18n.format("PENOMBRE.Warnings.mjErreur", { erreur: err.message }))
    return { ok: false }
  }
}

/**
 * Refuse une requête reçue par le MJ si la condition est fausse : l'erreur est renvoyée à l'expéditeur.
 * @param {boolean} condition
 * @param {string} parametre Nom du paramètre invalide
 */
export function verifierRequete(condition, parametre) {
  if (!condition) throw new Error(game.i18n.format("PENOMBRE.Warnings.requeteInvalide", { parametre }))
}

/**
 * @param {*} valeur
 * @returns {boolean} Vrai pour un entier supérieur ou égal à 1
 */
export function estEntierPositif(valeur) {
  return Number.isInteger(valeur) && valeur >= 1
}
