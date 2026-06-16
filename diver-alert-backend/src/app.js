/**
 * src/app.js
 *
 * Instance Express centrale.
 * Ordre des middlewares intentionnel — ne pas réorganiser :
 *  1. Sécurité HTTP (helmet, cors)
 *  2. Logging (morgan)
 *  3. Parsing des corps de requêtes
 *  4. Rate limiting
 *  5. Route de santé
 *  6. Routes métier (branchées progressivement)
 *  7. 404
 *  8. Gestionnaire d'erreurs centralisé
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');

const config = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// ─── 1. Sécurité HTTP ────────────────────────────────────────────────────────

// helmet : applique ~15 headers de sécurité en une ligne
// (supprime X-Powered-By, ajoute X-Frame-Options, X-Content-Type-Options, etc.)
app.use(helmet());

// CORS : n'accepte les requêtes cross-origin que depuis le frontend déclaré
app.use(cors({
  origin: config.cors.clientUrl,
  credentials: true,          // Autorise les cookies et headers Authorization
  optionsSuccessStatus: 200,  // Compatibilité avec certains navigateurs anciens
}));

// ─── 2. Logging ──────────────────────────────────────────────────────────────

// morgan : affiche chaque requête HTTP en console (désactivé en production)
if (config.isDev) {
  app.use(morgan('dev'));
}

// ─── 3. Parsing ──────────────────────────────────────────────────────────────

// Limite à 10kb : protège contre les payloads JSON volumineux (attaque DoS basique)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── 4. Rate Limiting ────────────────────────────────────────────────────────

// Limiteur ciblé sur les routes d'authentification uniquement
// Objectif : ralentir les attaques par brute-force sur login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // Fenêtre glissante de 15 minutes
  limit: 10,                   // Max 10 requêtes par IP par fenêtre
  standardHeaders: 'draft-7',  // Envoie les headers RateLimit standardisés
  legacyHeaders: false,        // Désactive les anciens headers X-RateLimit-*
  message: {
    status: 'error',
    message: 'Trop de tentatives de connexion. Réessaie dans 15 minutes.',
  },
});

// Appliqué ici pour intercepter AVANT même que les routes soient définies
//app.use('/api/auth', authLimiter);

// ─── 5. Route de santé ───────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// ─── 6. Routes métier ────────────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth.routes'));
app.use('/api/alerts', require('./routes/alert.routes'));  // ← décommenter

// ─── 7. Route inconnue (404) ─────────────────────────────────────────────────

app.use(notFound);

// ─── 8. Gestionnaire d'erreurs centralisé ────────────────────────────────────

// Doit impérativement être le dernier middleware
app.use(errorHandler);

module.exports = app;