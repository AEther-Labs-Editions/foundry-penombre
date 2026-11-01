/**
 * Règles des jetons de conscience en fonctions pures, testables sans Foundry (tests/unit).
 *
 * Les jetons non perdus (disponibles ou dépensés) sont en tête du tableau et leur nombre est la valeur de
 * conscience, qui ne dépasse pas le maximum ; les jetons perdus suivent. Chaque fonction renvoie un nouveau
 * tableau (et la nouvelle valeur si elle change), ou null si l'opération est impossible : rien n'est modifié.
 */
import { JETON_STATUTS } from "../config/system.mjs"

const ACTIF = JETON_STATUTS.actif.id
const INACTIF = JETON_STATUTS.inactif.id
const PERDU = JETON_STATUTS.perdu.id

/**
 * @typedef {{statut: string}} Jeton
 */

/**
 * @param {Jeton[]} jetons
 * @returns {number} Nombre de jetons disponibles
 */
export function nbJetonsDisponibles(jetons) {
  return jetons.filter((j) => j.statut === ACTIF).length
}

/**
 * Dépense des jetons, tout ou rien : les premiers jetons disponibles deviennent dépensés.
 * @param {Jeton[]} jetons
 * @param {number} nbJetons
 * @returns {Jeton[]|null} null s'il ne reste pas assez de jetons disponibles
 */
export function depenser(jetons, nbJetons) {
  if (nbJetonsDisponibles(jetons) < nbJetons) return null
  let reste = nbJetons
  return jetons.map((jeton) => {
    if (reste > 0 && jeton.statut === ACTIF) {
      reste--
      return { ...jeton, statut: INACTIF }
    }
    return { ...jeton }
  })
}

/**
 * Envolée : le premier jeton dépensé redevient disponible.
 * @param {Jeton[]} jetons
 * @returns {Jeton[]|null} null s'il n'y a aucun jeton dépensé
 */
export function regagner(jetons) {
  const index = jetons.findIndex((j) => j.statut === INACTIF)
  if (index === -1) return null
  return jetons.map((jeton, i) => (i === index ? { ...jeton, statut: ACTIF } : { ...jeton }))
}

/**
 * Un jeton disponible est dépensé, un jeton dépensé redevient disponible.
 * @param {Jeton[]} jetons
 * @param {number} index
 * @returns {Jeton[]|null} null si le jeton n'existe pas ou est perdu
 */
export function basculer(jetons, index) {
  const statut = jetons[index]?.statut
  if (statut !== ACTIF && statut !== INACTIF) return null
  return jetons.map((jeton, i) => (i === index ? { ...jeton, statut: statut === ACTIF ? INACTIF : ACTIF } : { ...jeton }))
}

/**
 * La conscience augmente de 1 : le premier jeton perdu revient, dépensé.
 * @param {Jeton[]} jetons
 * @param {number} valeur Valeur de conscience
 * @param {number} max Conscience maximum
 * @returns {{jetons: Jeton[], valeur: number}|null} null si la conscience est au maximum
 */
export function ajouter(jetons, valeur, max) {
  if (valeur >= max || !jetons[valeur]) return null
  return { jetons: jetons.map((jeton, i) => (i === valeur ? { ...jeton, statut: INACTIF } : { ...jeton })), valeur: valeur + 1 }
}

/**
 * Perte d'un jeton précis : il passe au statut perdu, en fin de tableau, et la conscience diminue de 1.
 * @param {Jeton[]} jetons
 * @param {number} valeur Valeur de conscience
 * @param {number} index
 * @returns {{jetons: Jeton[], valeur: number}|null} null si le jeton n'existe pas ou est déjà perdu
 */
export function perdre(jetons, valeur, index) {
  if (!jetons[index] || jetons[index].statut === PERDU) return null
  const nouveaux = jetons.map((jeton) => ({ ...jeton }))
  const [jetonPerdu] = nouveaux.splice(index, 1)
  nouveaux.push({ ...jetonPerdu, statut: PERDU })
  return { jetons: nouveaux, valeur: Math.max(valeur - 1, 0) }
}

/**
 * Fausse note : jeton à perdre, un jeton dépensé de préférence, sinon un jeton disponible.
 * @param {Jeton[]} jetons
 * @returns {number} Index du jeton, -1 s'il n'y a plus aucun jeton à perdre
 */
export function indexJetonAPerdre(jetons) {
  const index = jetons.findIndex((j) => j.statut === INACTIF)
  return index !== -1 ? index : jetons.findIndex((j) => j.statut === ACTIF)
}

/**
 * Vérifie la règle de la conscience.
 * @param {Jeton[]} jetons
 * @param {number} valeur
 * @param {number} max
 * @returns {boolean} Vrai si les jetons non perdus sont en tête, en nombre égal à la valeur, sans dépasser le maximum
 */
export function respecteRegle(jetons, valeur, max) {
  const nbNonPerdus = jetons.filter((j) => j.statut !== PERDU).length
  const enTete = jetons.slice(0, nbNonPerdus).every((j) => j.statut !== PERDU)
  return enTete && nbNonPerdus === valeur && valeur <= max
}
