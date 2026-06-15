/**
 * server.js
 *
 * Point d'entrée du serveur.
 * Ordre de démarrage impératif :
 *  1. Chargement .env
 *  2. Validation des variables d'environnement
 *  3. Connexion MongoDB
 *  4. Création du serveur HTTP (wrapping Express)
 *  5. Attachement Socket.io sur le serveur HTTP
 *  6. Démarrage du listener sur le port
 *
 * ⚠️ Socket.io doit être attaché au serveur HTTP, PAS à l'app Express.
 *    app.listen() crée un serveur HTTP implicite inaccessible à Socket.io.
 *    http.createServer(app) expose ce serveur pour Socket.io.
 */

require('dotenv').config();

const config   = require('./src/config/env');
const http     = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app              = require('./src/app');
const { connectDB }    = require('./src/config/db');
const { initSocket }   = require('./src/socket/socket.handler');

connectDB()
  .then(() => {

    // ── Serveur HTTP ───────────────────────────────────────────────────────
    // On enveloppe Express dans un serveur HTTP natif Node.js
    // pour que Socket.io puisse partager le même port
    const server = http.createServer(app);

    // ── Socket.io ─────────────────────────────────────────────────────────
    const io = new Server(server, {
      cors: {
        origin:      config.cors.clientUrl,  // Seul le frontend autorisé
        methods:     ['GET', 'POST'],
        credentials: true,
      },
      // Délais adaptés aux connexions réseau potentiellement instables en mer
      pingInterval:  25000,  // Ping client toutes les 25s
      pingTimeout:   60000,  // Considère la connexion perdue après 60s sans réponse
    });

    // Déléguer la logique Socket.io au handler dédié
    initSocket(io);

    // ── Démarrage HTTP ────────────────────────────────────────────────────
    server.listen(config.port, () => {
      console.log(`🚀 Serveur actif sur le port ${config.port} [${config.nodeEnv}]`);
    });

    // ── Arrêt propre ──────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n🛑 Signal ${signal} — arrêt propre...`);
      io.close(() => {
        console.log('🔌 Socket.io fermé.');
      });
      server.close(async () => {
        await mongoose.connection.close();
        console.log('🔌 MongoDB fermé.');
        process.exit(0);
      });
    };

    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('❌ Démarrage impossible :', err.message);
    process.exit(1);
  });