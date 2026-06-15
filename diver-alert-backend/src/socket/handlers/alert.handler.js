/**
 * src/socket/handlers/alert.handler.js
 *
 * Deux handlers :
 *  handleSOS    — déclenche une alerte SOS ciblée dans un rayon
 *  handleCancel — annule une alerte active
 *
 * ── Flux handleSOS ──────────────────────────────────────────────────────────
 *  1. Valider la position GPS reçue
 *  2. Lire le rayon depuis connectedDivers (le plus récent disponible)
 *  3. Filtrer les plongeurs en ligne ET avec une position connue
 *  4. Calculer ceux dans le rayon via getDiversWithinRadius (Haversine)
 *  5. Persister l'alerte en MongoDB
 *  6. Envoyer alert:received à chaque socket ciblé individuellement
 *  7. Confirmer à l'émetteur avec le nombre de plongeurs notifiés
 *
 * ── Flux handleCancel ───────────────────────────────────────────────────────
 *  1. Valider l'alertId
 *  2. Vérifier que l'appelant est l'émetteur de l'alerte
 *  3. Vérifier que l'alerte est encore active
 *  4. Persister le changement de statut
 *  5. Diffuser alert:cancelled à TOUS (io.emit — pas seulement le rayon initial)
 */

const mongoose = require('mongoose');
const Alert = require('../../models/Alert');
const { validatePosition } = require('../../validators/position.validators');
const { getDiversWithinRadius } = require('../../utils/haversine');

// ── handleSOS ─────────────────────────────────────────────────────────────────

/**
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @param {{ latitude, longitude, accuracy?, radius? }} data
 * @param {Map} connectedDivers
 */
const handleSOS = async (socket, io, data, connectedDivers) => {
    const { id: userId, name, role } = socket.data.user;

    // ── 1. Validation GPS ────────────────────────────────────────────────────
    const { valid, errors } = validatePosition(data);
    if (!valid) {
        socket.emit('error', { code: 'INVALID_SOS_POSITION', errors });
        return;
    }

    const { latitude, longitude, accuracy = null } = data;

    // ── 2. Rayon d'alerte ────────────────────────────────────────────────────
    // Source de vérité : Map mémoire (mise à jour à chaque diver:position)
    // Fallback : data.radius → valeur par défaut stockée à la connexion
    const diverData = connectedDivers.get(userId);
    const radius = diverData?.radius ?? 5;

    // ── 3. Plongeurs candidats ───────────────────────────────────────────────
    // Exclure : l'émetteur lui-même + les plongeurs sans position connue
    const candidates = Array.from(connectedDivers.entries())
        .filter(([uid, d]) => uid !== userId && d.position !== null)
        .map(([uid, d]) => ({ userId: uid, position: d.position }));

    // ── 4. Filtrage par rayon (Haversine) ────────────────────────────────────
    const diversInRange = getDiversWithinRadius(
        { latitude, longitude },
        candidates,
        radius
    );

    // ── 5. Persistance MongoDB ───────────────────────────────────────────────
    const alert = await Alert.create({
        emitter: userId,
        position: { latitude, longitude, accuracy },
        radius,
        status: 'active',
    });

    const alertPayload = {
        alertId: alert._id.toString(),
        emitter: { userId, name, role },
        position: { latitude, longitude, accuracy },
        radius,
        createdAt: alert.createdAt,
    };

    // ── 6. Notification ciblée ───────────────────────────────────────────────
    // Chaque plongeur dans le rayon reçoit l'événement individuellement
    // (pas de broadcast global — confidentialité des alertes)
    let notifiedCount = 0;

    for (const targetUserId of diversInRange) {
        const targetData = connectedDivers.get(targetUserId);
        if (!targetData) continue;

        const targetSocket = io.sockets.sockets.get(targetData.socketId);
        if (targetSocket) {
            targetSocket.emit('alert:received', alertPayload);
            notifiedCount++;
        }
    }

    // ── 7. Confirmation à l'émetteur ─────────────────────────────────────────
    socket.emit('alert:confirmed', {
        alertId: alert._id.toString(),
        notifiedCount,
        diversInRange: diversInRange.length,
        radius,
        message: notifiedCount === 0
            ? 'Alerte émise — aucun plongeur dans le rayon actuellement'
            : `Alerte émise — ${notifiedCount} plongeur(s) notifié(s)`,
    });

    console.log(
        `🆘 Alerte SOS [${alert._id}] — ${name} → ` +
        `${notifiedCount}/${candidates.length} plongeur(s) dans ${radius}km`
    );
};

// ── handleCancel ──────────────────────────────────────────────────────────────

/**
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @param {{ alertId: string }} data
 */
const handleCancel = async (socket, io, data) => {
    const { id: userId, name } = socket.data.user;

    // ── Validation de l'alertId ──────────────────────────────────────────────
    const { alertId } = data || {};

    if (!alertId || !mongoose.Types.ObjectId.isValid(alertId)) {
        socket.emit('error', { code: 'INVALID_ALERT_ID', message: 'alertId invalide ou manquant' });
        return;
    }

    const alert = await Alert.findById(alertId);

    if (!alert) {
        socket.emit('error', { code: 'ALERT_NOT_FOUND', message: 'Alerte introuvable' });
        return;
    }

    // ── Vérification des droits ──────────────────────────────────────────────
    if (alert.emitter.toString() !== userId) {
        socket.emit('error', {
            code: 'UNAUTHORIZED',
            message: "Seul l'émetteur peut annuler sa propre alerte",
        });
        return;
    }

    if (alert.status !== 'active') {
        socket.emit('error', {
            code: 'ALERT_NOT_ACTIVE',
            message: `Cette alerte est déjà « ${alert.status} »`,
        });
        return;
    }

    // ── Persistance de l'annulation ──────────────────────────────────────────
    await alert.cancel();

    const cancelPayload = {
        alertId: alert._id.toString(),
        cancelledBy: { userId, name },
        cancelledAt: alert.cancelledAt,
    };

    // io.emit → tous les sockets connectés (y compris l'émetteur)
    // Raison : des plongeurs peuvent s'être déplacés depuis l'alerte —
    // tous doivent savoir que la situation est résolue
    io.emit('alert:cancelled', cancelPayload);

    console.log(`✅ Alerte [${alert._id}] annulée par ${name}`);
};

module.exports = { handleSOS, handleCancel };