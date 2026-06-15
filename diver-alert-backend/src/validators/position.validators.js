/**
 * src/validators/position.validators.js
 *
 * Validation manuelle des positions GPS reçues via Socket.io.
 *
 * Pourquoi pas express-validator ici ?
 * Socket.io n'est pas Express — les événements WebSocket n'ont pas de req/res.
 * La validation est donc faite manuellement avec une fonction pure, testable
 * sans serveur.
 *
 * Utilisée dans src/socket/socket.handler.js (étape 14).
 */

/**
 * Valide un objet de position GPS.
 *
 * @param {{ latitude: any, longitude: any, accuracy?: any }} position
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validatePosition = ({ latitude, longitude, accuracy } = {}) => {
    const errors = [];

    // Latitude
    if (latitude === undefined || latitude === null) {
        errors.push('La latitude est obligatoire');
    } else if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
        errors.push('Latitude invalide — valeur numérique entre -90 et 90');
    }

    // Longitude
    if (longitude === undefined || longitude === null) {
        errors.push('La longitude est obligatoire');
    } else if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
        errors.push('Longitude invalide — valeur numérique entre -180 et 180');
    }

    // Précision GPS (optionnelle)
    if (accuracy !== undefined && accuracy !== null) {
        if (typeof accuracy !== 'number' || accuracy < 0) {
            errors.push('La précision GPS doit être un nombre positif');
        }
    }

    return { valid: errors.length === 0, errors };
};

module.exports = { validatePosition };