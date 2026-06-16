/**
 * src/utils/haversine.js (frontend)
 *
 * Calcul de distance GPS côté client — même formule que le backend.
 * Utilisé dans AlertNotification pour afficher la distance vers l'émetteur.
 */

const EARTH_KM = 6371
const toRad = (deg) => (deg * Math.PI) / 180

/**
 * @param {{ latitude: number, longitude: number }} p1
 * @param {{ latitude: number, longitude: number }} p2
 * @returns {number} Distance en km (2 décimales)
 */
export const haversineDistance = (p1, p2) => {
    const lat1 = toRad(p1.latitude)
    const lat2 = toRad(p2.latitude)
    const dLat = toRad(p2.latitude - p1.latitude)
    const dLon = toRad(p2.longitude - p1.longitude)

    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

    return parseFloat((EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2))
}