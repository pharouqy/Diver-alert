/**
 * src/controllers/message.controller.js
 *
 * CRUD REST pour la messagerie interne.
 * Le transport temps réel est géré par socket/handlers/message.handler.js.
 */

const mongoose = require('mongoose');
const Message = require('../models/Message');

/**
 * GET /api/messages/unread
 * Retourne le nombre de messages non-lus par expéditeur.
 * { senderId: count, ... }
 */
const getUnreadCounts = async (req, res, next) => {
  try {
    const myId = req.user._id;

    const groups = await Message.aggregate([
      { $match: { receiver: myId, read: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } },
    ]);

    const counts = {};
    groups.forEach(({ _id, count }) => {
      counts[_id.toString()] = count;
    });

    res.status(200).json({ status: 'success', data: { counts } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/messages/:userId
 * Historique de la conversation avec :userId (50 derniers messages, tri chrono asc).
 */
const getConversation = async (req, res, next) => {
  try {
    const myId = req.user._id;
    const otherId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      const err = new Error('userId invalide');
      err.statusCode = 400;
      return next(err);
    }

    const otherObjId = new mongoose.Types.ObjectId(otherId);

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherObjId },
        { sender: otherObjId, receiver: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('sender', 'name')
      .populate('receiver', 'name')
      .lean();

    res.status(200).json({ status: 'success', data: { messages } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/messages/:userId/read
 * Marque tous les messages de :userId → moi comme lus.
 */
const markRead = async (req, res, next) => {
  try {
    const myId = req.user._id;
    const otherId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      const err = new Error('userId invalide');
      err.statusCode = 400;
      return next(err);
    }

    await Message.updateMany(
      { sender: new mongoose.Types.ObjectId(otherId), receiver: myId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUnreadCounts, getConversation, markRead };
