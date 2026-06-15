/**
 * src/utils/haversine.js
 *
 * Calcul de distance géodésique entre deux points GPS.
 *
 * La formule de Haversine calcule la distance orthodromique (grand cercle)
 * entre deux points sur une sphère — ici la Terre (rayon moyen : 6371 km).
 * Précision : erreur < 0.3% sur les distances courtes à moyennes.
 * Suffisant pour un rayon d'alerte maritime de quelques centaines de mètres à 100 km.
 *
 * Utilisé dans :
 *  — src/socket/socket.handler.js : filtrage des plongeurs à alerter (étape 15)
 *  — src/controllers/alert.controller.js : validation du rayon (étape 16)
 */

/** Rayon moyen de la Terre en kilomètres */
const EARTH_RADIUS_KM = 6371;

/**
 * Convertit des degrés décimaux en radians.
 * @param {number} deg
 * @returns {number}
 */
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Calcule la distance en kilomètres entre deux coordonnées GPS.
 *
 * @param {{ latitude: number, longitude: number }} p1 - Point de départ
 * @param {{ latitude: number, longitude: number }} p2 - Point d'arrivée
 * @returns {number} Distance en km (3 décimales)
 *
 * @example
 * haversineDistance(
 *   { latitude: 36.737, longitude: 3.086 },  // Alger
 *   { latitude: 36.752, longitude: 3.086 }   // ~1.67 km au nord
 * ); // → 1.670
 */
const haversineDistance = (p1, p2) => {
    const lat1 = toRad(p1.latitude);
    const lat2 = toRad(p2.latitude);
    const Δlat = toRad(p2.latitude - p1.latitude);
    const Δlon = toRad(p2.longitude - p1.longitude);

    // Formule de Haversine
    const a =
        Math.sin(Δlat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(Δlon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return parseFloat((EARTH_RADIUS_KM * c).toFixed(3));
};

/**
 * Vérifie si un point cible est dans le rayon d'alerte d'un émetteur.
 *
 * @param {{ latitude: number, longitude: number }} emitter - Position de l'émetteur
 * @param {{ latitude: number, longitude: number }} target  - Position du plongeur cible
 * @param {number} radiusKm                                 - Rayon en km
 * @returns {boolean}
 */
const isWithinRadius = (emitter, target, radiusKm) =>
    haversineDistance(emitter, target) <= radiusKm;

/**
 * Filtre une liste de plongeurs connectés et retourne ceux dans le rayon de l'émetteur.
 * Utilisé dans le socket handler lors de l'émission d'une alerte SOS.
 *
 * @param {{ latitude: number, longitude: number }} emitterPosition
 * @param {Array<{ userId: string, position: { latitude: number, longitude: number } }>} divers
 *   Liste des plongeurs connectés avec leur position courante
 * @param {number} radiusKm - Rayon d'alerte en km
 * @returns {string[]} Liste des userIds des plongeurs dans le rayon (émetteur exclu)
 *
 * @example
 * getDiversWithinRadius(
 *   { latitude: 36.737, longitude: 3.086 },
 *   [
 *     { userId: 'abc', position: { latitude: 36.740, longitude: 3.086 } }, // 0.3 km → inclus
 *     { userId: 'def', position: { latitude: 36.900, longitude: 3.086 } }, // 18 km → exclu
 *   ],
 *   5
 * ); // → ['abc']
 */
const getDiversWithinRadius = (emitterPosition, divers, radiusKm) =>
    divers
        .filter(({ position }) => isWithinRadius(emitterPosition, position, radiusKm))
        .map(({ userId }) => userId);

module.exports = { haversineDistance, isWithinRadius, getDiversWithinRadius };