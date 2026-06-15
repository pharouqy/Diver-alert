/**
 * src/config/db.js
 *
 * Connexion à MongoDB via Mongoose.
 * Exporté comme fonction async — appelée une seule fois dans server.js.
 * Mongoose 8.x : useNewUrlParser et useUnifiedTopology ne sont plus nécessaires.
 */

const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  await mongoose.connect(config.db.uri, {
    // Échoue en 5s si MongoDB est inaccessible — évite une attente infinie
    serverSelectionTimeoutMS: 5000,
  });

  console.log(`✅ MongoDB connecté : ${mongoose.connection.host}`);

  // Surveillance des événements de connexion après le démarrage
  mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB :', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB déconnecté — reconnexion automatique en cours...');
  });
};

module.exports = { connectDB };