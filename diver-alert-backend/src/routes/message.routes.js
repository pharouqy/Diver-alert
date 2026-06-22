/**
 * src/routes/message.routes.js
 *
 * Routes REST pour la messagerie interne.
 * Toutes les routes nécessitent une authentification.
 */

const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { getUnreadCounts, getConversation, markRead } = require('../controllers/message.controller');

const router = express.Router();

router.use(protect);

// Ordre important : /unread avant /:userId pour éviter la collision de route
router.get('/unread', getUnreadCounts);
router.get('/:userId', getConversation);
router.patch('/:userId/read', markRead);

module.exports = router;
