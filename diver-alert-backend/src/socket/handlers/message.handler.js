/**
 * src/socket/handlers/message.handler.js
 *
 * Handler pour la messagerie privée temps réel.
 * Événement entrant : 'chat:message' { receiverId, content }
 * Événements sortants :
 *   'chat:message' → au destinataire (si connecté)
 *   'chat:sent'    → à l'émetteur (confirmation avec _id en base)
 *   'chat:error'   → à l'émetteur en cas d'erreur de validation
 */

const mongoose = require('mongoose');
const Message = require('../../models/Message');

const handleChatMessage = async (socket, io, data, connectedDivers) => {
  const senderId = socket.data.user.id;
  const senderName = socket.data.user.name;

  // ── Validation du payload ────────────────────────────────────────────────
  const { receiverId, content } = data || {};

  if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
    return socket.emit('chat:error', { code: 'INVALID_RECEIVER', message: 'Destinataire invalide' });
  }

  if (senderId === receiverId) {
    return socket.emit('chat:error', { code: 'SELF_MESSAGE', message: 'Impossible de vous envoyer un message' });
  }

  const trimmed = typeof content === 'string' ? content.trim() : '';
  if (!trimmed) {
    return socket.emit('chat:error', { code: 'EMPTY_CONTENT', message: 'Le message ne peut pas être vide' });
  }
  if (trimmed.length > 2000) {
    return socket.emit('chat:error', { code: 'TOO_LONG', message: 'Message trop long (max 2000 caractères)' });
  }

  // ── Persistance en base ──────────────────────────────────────────────────
  const message = await Message.create({
    sender: new mongoose.Types.ObjectId(senderId),
    receiver: new mongoose.Types.ObjectId(receiverId),
    content: trimmed,
  });

  const msgPayload = {
    _id: message._id.toString(),
    sender: { _id: senderId, name: senderName },
    receiver: { _id: receiverId },
    content: trimmed,
    createdAt: message.createdAt.toISOString(),
    read: false,
  };

  // ── Livraison temps réel au destinataire (s'il est connecté) ────────────
  if (connectedDivers.has(receiverId)) {
    const receiverData = connectedDivers.get(receiverId);
    const receiverSocket = io.sockets.sockets.get(receiverData.socketId);
    if (receiverSocket) {
      receiverSocket.emit('chat:message', msgPayload);
    }
  }

  // ── Confirmation à l'émetteur ────────────────────────────────────────────
  socket.emit('chat:sent', msgPayload);
};

module.exports = { handleChatMessage };
