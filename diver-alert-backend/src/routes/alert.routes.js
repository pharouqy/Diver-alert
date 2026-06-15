/**
 * src/routes/alert.routes.js
 *
 * ⚠️  Ordre des routes CRITIQUE :
 *   GET /mine doit être déclaré AVANT GET /:id
 *   Sinon Express interpréterait "mine" comme un :id MongoDB → CastError.
 */

const express = require('express');

const {
  getAlerts,
  getMyAlerts,
  getAlertById,
  updateAlertStatus,
} = require('../controllers/alert.controller');

const { protect }                  = require('../middlewares/auth.middleware');
const { updateAlertStatusRules }   = require('../validators/alert.validators');
const { validate }                 = require('../middlewares/validate.middleware');

const router = express.Router();

// Toutes les routes de ce fichier nécessitent un JWT valide
router.use(protect);

// ── Routes sans paramètre d'abord ─────────────────────────────────────────────
router.get('/',     getAlerts);    // GET /api/alerts?status=active&page=1&limit=10
router.get('/mine', getMyAlerts);  // GET /api/alerts/mine

// ── Routes avec paramètre ─────────────────────────────────────────────────────
router.get   ('/:id',        getAlertById);
router.patch ('/:id/status', updateAlertStatusRules, validate, updateAlertStatus);

module.exports = router;