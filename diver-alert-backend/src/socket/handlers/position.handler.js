/**
 * src/socket/handlers/position.handler.js
 *
 * Handler pour l'événement 'diver:position'.
 *
 * Flux :
 *  1. Valider les coordonnées GPS (validatePosition)
 *  2. Vérifier la précision GPS — avertir si insuffisante (ne pas bloquer)
 *  3. Mettre à jour connectedDivers en mémoire
 *  4. Diffuser à tous les autres plongeurs (socket.broadcast)
 *  5. Throttler les écritures lastSeen en DB (max 1 write / 30s par plongeur)
 *
 * ── Fréquence d'émission côté client ──────────────────────────────────────
 * Le client émet 'diver:position' toutes les POSITION_UPDATE_INTERVAL_MS (env).
 * Le handler ne throttle PAS la réception/diffusion — seulement l'écriture DB.
 * Exemple : client émet toutes les 5s → ~12 updates/min → 1 DB write/min.
 *
 * ── Précision GPS acceptable ───────────────────────────────────────────────
 * Seuil d'avertissement : accuracy > GPS_ACCURACY_WARN_THRESHOLD_M (500 m).
 * On diffuse quand même — bloquer une alerte SOS à cause d'une mauvaise
 * précision serait dangereux. On loggue uniquement pour le monitoring.
 */

const User = require('../../models/User');
const { validatePosition } = require('../../validators/position.validators');

/** Fréquence minimale des écritures DB lastSeen (indépendante des émissions socket) */
const DB_UPDATE_INTERVAL_MS = 30_000;

/** Seuil de précision GPS au-delà duquel on log un avertissement (en mètres) */
const GPS_ACCURACY_WARN_THRESHOLD_M = 500;

/**
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @param {Object} data         - Données reçues du client
 * @param {Map}    connectedDivers
 */
const handlePosition = (socket, io, data, connectedDivers) => {
  const { id: userId, name } = socket.data.user;

  // ── 1. Validation des coordonnées GPS ──────────────────────────────────────
  const { valid, errors } = validatePosition(data);

  if (!valid) {
    // Renvoyer l'erreur au seul émetteur — les autres ne sont pas concernés
    socket.emit('error', { code: 'INVALID_POSITION', errors });
    return;
  }

  const { latitude, longitude, accuracy = null, radius } = data;

  // ── 2. Vérification de la précision GPS ────────────────────────────────────
  if (accuracy !== null && accuracy > GPS_ACCURACY_WARN_THRESHOLD_M) {
    console.warn(
      `⚠️  Précision GPS faible — ${name} : ${accuracy}m ` +
      `(seuil : ${GPS_ACCURACY_WARN_THRESHOLD_M}m)`
    );
    // On continue — une alerte SOS doit passer même avec une mauvaise précision
  }

  // ── 3. Mise à jour de la Map en mémoire ────────────────────────────────────
  const current = connectedDivers.get(userId);
  if (!current) return; // Guard — ne devrait pas arriver après auth

  // Mise à jour du rayon uniquement si le client en envoie un valide
  const newRadius = (typeof radius === 'number' && radius >= 0.1 && radius <= 100)
    ? radius
    : current.radius;

  const updated = {
    ...current,
    position: { latitude, longitude, accuracy },
    radius:   newRadius,
  };

  connectedDivers.set(userId, updated);

  // ── 4. Diffusion aux autres plongeurs ──────────────────────────────────────
  // socket.broadcast → tous les sockets connectés SAUF l'émetteur
  socket.broadcast.emit('diver:position', {
    userId,
    name,
    position: { latitude, longitude, accuracy },
    radius:   newRadius,
  });

  // ── 5. Écriture DB throttlée ───────────────────────────────────────────────
  const now = Date.now();
  const lastWrite = current.lastDbUpdate || 0;

  if (now - lastWrite >= DB_UPDATE_INTERVAL_MS) {
    // Mettre à jour le timestamp en mémoire AVANT l'appel async
    connectedDivers.set(userId, { ...updated, lastDbUpdate: now });

    User.findByIdAndUpdate(userId, { lastSeen: new Date() })
      .catch((err) =>
        console.error(`Erreur lastSeen update [${userId}] :`, err.message)
      );
  }
};

module.exports = { handlePosition };