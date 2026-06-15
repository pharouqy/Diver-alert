/**
 * src/config/env.js
 *
 * Charge, valide et exporte toutes les variables d'environnement.
 * Doit être importé APRÈS require('dotenv').config() dans server.js.
 * Fait planter le serveur immédiatement si une variable obligatoire est absente —
 * mieux vaut un crash clair au démarrage qu'un bug silencieux en production.
 */

const REQUIRED_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `❌ Variables d'environnement manquantes : ${missing.join(', ')}\n` +
    `   Vérifie ton fichier .env (voir .env.example)`
  );
  process.exit(1);
}

module.exports = {
  // Serveur
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Base de données
  db: {
    uri: process.env.MONGO_URI,
  },

  // Authentification JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  // CORS — origines autorisées
  cors: {
    clientUrl: process.env.CLIENT_URL,
  },

  // Logique métier — alertes et positions
  alert: {
    defaultRadiusKm: parseFloat(process.env.ALERT_RADIUS_DEFAULT_KM) || 5,
  },
  position: {
    updateIntervalMs: parseInt(process.env.POSITION_UPDATE_INTERVAL_MS, 10) || 5000,
  },
};