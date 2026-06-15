/**
 * src/socket/socket.middleware.js
 *
 * Middleware d'authentification Socket.io.
 * Vérifie le JWT reçu dans socket.handshake.auth.token.
 *
 * Côté client (frontend), la connexion doit être initiée ainsi :
 *   const socket = io('http://localhost:5000', {
 *     auth: { token: 'eyJhbGci...' }  // le JWT sans "Bearer"
 *   });
 *
 * Si le token est absent, invalide ou expiré → next(new Error(...))
 *   → connexion refusée AVANT io.on('connection')
 *   → le client reçoit l'événement 'connect_error'
 *
 * Si le token est valide → socket.data.user est alimenté → next()
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

const authSocketMiddleware = async (socket, next) => {
  try {
    // Extraire le token depuis socket.handshake.auth
    const raw = socket.handshake.auth?.token;

    if (!raw) {
      return next(new Error('AUTH_MISSING_TOKEN'));
    }

    // Accepter avec ou sans préfixe "Bearer" pour la flexibilité côté client
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

    // Vérifier la signature et l'expiration
    const decoded = jwt.verify(token, config.jwt.secret);

    // Vérifier que l'utilisateur existe toujours en base
    const user = await User.findById(decoded.id).lean();

    if (!user) {
      return next(new Error('AUTH_USER_NOT_FOUND'));
    }

    // Injecter les données utilisateur dans le socket — disponibles dans tous les handlers
    // socket.data persiste pour toute la durée de la connexion socket
    socket.data.user = {
      id:   user._id.toString(),
      name: user.name,
      role: user.role,
    };

    next();

  } catch (err) {
    if (err.name === 'JsonWebTokenError')  return next(new Error('AUTH_INVALID_TOKEN'));
    if (err.name === 'TokenExpiredError')  return next(new Error('AUTH_TOKEN_EXPIRED'));
    console.error('Erreur middleware auth socket :', err.message);
    next(new Error('AUTH_ERROR'));
  }
};

module.exports = { authSocketMiddleware };