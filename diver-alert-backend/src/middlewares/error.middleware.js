const config = require('../config/env');

const notFound = (req, res, next) => {
  const err = new Error(`Route non trouvée : ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

const errorHandler = (err, req, res, next) => {
  if (config.isDev) {
    console.error('🔴', err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message || 'Erreur interne du serveur';

  // ── Erreurs Mongoose ──────────────────────────────────────────────────────

  // Duplication de clé unique (ex : email déjà utilisé) — code MongoDB 11000
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'champ';
    message = `La valeur du champ '${field}' est déjà utilisée`;
  }

  // Erreur de validation Mongoose (schéma non respecté côté base)
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Données invalides';
  }

  // CastError : ObjectId MongoDB mal formé (ex : /api/alerts/abc au lieu d'un ID valide)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Identifiant invalide : ${err.value}`;
  }

  // Token JWT invalide ou expiré (anticipé pour l'étape 10)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalide';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expirée — reconnexion requise';
  }

  // ── Réponse ───────────────────────────────────────────────────────────────

  const body = { status: 'error', message };

  // Erreurs de validation structurées (de validate.middleware.js)
  if (err.errors && Array.isArray(err.errors)) {
    body.errors = err.errors;
  }

  // Stack trace en développement uniquement
  if (config.isDev) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };