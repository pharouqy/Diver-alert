/**
 * src/socket/socket.handler.js
 *
 * Handler Socket.io principal.
 * Le middleware authSocketMiddleware garantit que tout socket arrivant
 * dans io.on('connection') est authentifié — socket.data.user est disponible.
 */

const User = require('../models/User');
const config = require('../config/env');
const { authSocketMiddleware } = require('./socket.middleware');
const { getActiveDivers } = require('./socket.utils');

const { handlePosition } = require('./handlers/position.handler');
const { handleSOS, handleCancel } = require('./handlers/alert.handler');
const { handleChatMessage } = require('./handlers/message.handler');

// ── État en mémoire ─────────────────────────────────────────────────────────

/** Map principale : userId → { socketId, name, role, position, radius } */
const connectedDivers = new Map();

/** Map inverse : socketId → userId */
const socketToUser = new Map();

// ── Handler principal ────────────────────────────────────────────────────────

const initSocket = (io) => {

    // ── Middleware d'authentification ─────────────────────────────────────────
    io.use(authSocketMiddleware);

    // ── Connexion (uniquement après auth réussie) ─────────────────────────────
    io.on('connection', (socket) => {
        const { id: userId, name, role } = socket.data.user;

        console.log(`✅ Plongeur connecté : ${name} [${role}] — socket: ${socket.id}`);

        // ── Gestion des connexions multiples (même utilisateur, double onglet) ───
        // Si le plongeur est déjà connecté, on déconnecte la session précédente
        if (connectedDivers.has(userId)) {
            const prevData = connectedDivers.get(userId);
            const prevSocket = io.sockets.sockets.get(prevData.socketId);
            if (prevSocket) {
                console.log(`⚠️  Double connexion détectée pour ${name} — déconnexion de l'ancienne session`);
                prevSocket.disconnect(true);
            }
            socketToUser.delete(prevData.socketId);
        }

        // ── Enregistrement dans les Maps ─────────────────────────────────────────
        connectedDivers.set(userId, {
            socketId: socket.id,
            name,
            role,
            position: null,
            radius: config.alert.defaultRadiusKm,
            lastDbUpdate: 0,                             // ← ajouter cette ligne
        });
        socketToUser.set(socket.id, userId);

        // ── Mise à jour du statut en base (fire-and-forget) ──────────────────────
        User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date(),
        }).catch((err) => console.error('isOnline update error:', err.message));

        // ── Envoyer la liste actuelle au plongeur qui vient de se connecter ──────
        socket.emit('divers:list', getActiveDivers(connectedDivers));

        // ── Annoncer l'arrivée aux autres plongeurs ───────────────────────────────
        socket.broadcast.emit('diver:joined', {
            userId,
            name,
            role,
            position: null,
            radius: config.alert.defaultRadiusKm,
        });

        // ── Événements métier (décommentés aux étapes suivantes) ─────────────────

        // Mise à jour de position → étape 14
        socket.on('diver:position', (data) => handlePosition(socket, io, data, connectedDivers, socketToUser));

        // les unhandled promise rejections qui crasheraient le process :
        socket.on('alert:sos', async (data) => {
            try {
                await handleSOS(socket, io, data, connectedDivers);
            } catch (err) {
                console.error('Erreur non gérée handleSOS:', err.message);
                socket.emit('error', { code: 'SOS_ERROR', message: "Erreur lors de l'émission de l'alerte" });
            }
        });

        // ── Messagerie privée ─────────────────────────────────────────────────
        socket.on('chat:message', async (data) => {
            try {
                await handleChatMessage(socket, io, data, connectedDivers);
            } catch (err) {
                console.error('Erreur non gérée handleChatMessage:', err.message);
                socket.emit('chat:error', { code: 'SERVER_ERROR', message: 'Erreur serveur lors de l\'envoi du message' });
            }
        });

        socket.on('alert:cancel', async (data) => {
            try {
                await handleCancel(socket, io, data);
            } catch (err) {
                console.error('Erreur non gérée handleCancel:', err.message);
                socket.emit('error', { code: 'CANCEL_ERROR', message: "Erreur lors de l'annulation" });
            }
        });

        // ── Déconnexion ───────────────────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            const uid = socketToUser.get(socket.id);
            if (!uid) return;

            connectedDivers.delete(uid);
            socketToUser.delete(socket.id);

            // Mise à jour statut en base
            User.findByIdAndUpdate(uid, {
                isOnline: false,
                lastSeen: new Date(),
            }).catch((err) => console.error('isOnline update error:', err.message));

            console.log(`👋 Plongeur déconnecté : userId=${uid} — raison : ${reason}`);
            socket.broadcast.emit('diver:disconnected', { userId: uid });
        });

        // ── Erreur ────────────────────────────────────────────────────────────────
        socket.on('error', (err) => {
            console.error(`❌ Erreur socket ${socket.id}:`, err.message);
        });
    });

    console.log('✅ Socket.io initialisé');
};

module.exports = { initSocket, connectedDivers, socketToUser };