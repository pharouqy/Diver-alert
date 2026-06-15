/**
 * src/models/Alert.js
 *
 * Schéma Mongoose pour une alerte SOS de plongeur.
 *
 * Ce qui est sauvegardé :
 *  — émetteur (référence User)
 *  — position GPS exacte au moment du déclenchement (lat, lng, précision)
 *  — rayon d'alerte en km (snapshot de la config au moment de l'émission)
 *  — état : active → cancelled (faux positif) | resolved (secours arrivés)
 *  — horodatages automatiques via timestamps
 *
 * Ce modèle sert aussi de journal d'audit minimal :
 * chaque alerte émise est persistée, même annulée.
 */

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    // ── Émetteur ─────────────────────────────────────────────────────────────
    emitter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'émetteur de l'alerte est obligatoire"],
      index: true,   // Optimise : "toutes les alertes de cet utilisateur"
    },

    // ── Position GPS au moment du déclenchement ───────────────────────────────
    // Validation des coordonnées en base : second filet après express-validator
    position: {
      latitude: {
        type: Number,
        required: [true, 'La latitude est obligatoire'],
        min: [-90,  'Latitude invalide — valeur entre -90 et 90'],
        max: [90,   'Latitude invalide — valeur entre -90 et 90'],
      },
      longitude: {
        type: Number,
        required: [true, 'La longitude est obligatoire'],
        min: [-180, 'Longitude invalide — valeur entre -180 et 180'],
        max: [180,  'Longitude invalide — valeur entre -180 et 180'],
      },
      // Précision GPS en mètres — fournie par navigator.geolocation.getCurrentPosition()
      // null si non disponible — utile pour évaluer la fiabilité de la position
      accuracy: {
        type: Number,
        default: null,
        min: [0, 'La précision GPS ne peut pas être négative'],
      },
    },

    // ── Rayon d'alerte ────────────────────────────────────────────────────────
    // Snapshot de la configuration du plongeur au moment de l'émission.
    // Important : ne pas référencer la config actuelle de l'utilisateur —
    // si le plongeur change son rayon plus tard, l'historique doit rester cohérent.
    radius: {
      type: Number,
      required: [true, 'Le rayon est obligatoire'],
      min: [0.1, "Le rayon doit être d'au moins 0.1 km"],
      max: [100, 'Le rayon ne peut pas dépasser 100 km'],
    },

    // ── État du cycle de vie ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['active', 'cancelled', 'resolved'],
        message: "Statut invalide — valeurs : 'active', 'cancelled', 'resolved'",
      },
      default: 'active',
      index: true,   // Optimise : "toutes les alertes actives"
    },

    // Horodatage de l'annulation par l'émetteur (faux positif / erreur de manip)
    cancelledAt: {
      type: Date,
      default: null,
    },

    // Horodatage de résolution (secours arrivés / situation résolue)
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    // createdAt = moment exact du déclenchement de l'alerte
    // updatedAt = dernière modification de statut
    timestamps: true,
  }
);

// ─── Index composés ───────────────────────────────────────────────────────────

// Historique global trié du plus récent au plus ancien
alertSchema.index({ createdAt: -1 });

// Requête : "alertes actives d'un plongeur spécifique"
alertSchema.index({ emitter: 1, status: 1 });

// ─── Méthodes d'instance ──────────────────────────────────────────────────────

/**
 * Annule l'alerte (faux positif ou erreur de déclenchement).
 *
 * ⚠️ La vérification que l'appelant est bien l'émetteur doit être faite
 *    dans le contrôleur AVANT d'appeler cette méthode.
 */
alertSchema.methods.cancel = async function () {
  this.status      = 'cancelled';
  this.cancelledAt = new Date();
  return this.save();
};

/**
 * Marque l'alerte comme résolue (secours arrivés, situation maîtrisée).
 */
alertSchema.methods.resolve = async function () {
  this.status     = 'resolved';
  this.resolvedAt = new Date();
  return this.save();
};

/**
 * Retourne la durée de l'alerte en secondes.
 * Calculé à la volée — non persisté en base.
 *
 * Usage : alert.durationSeconds
 */
alertSchema.virtual('durationSeconds').get(function () {
  const end = this.cancelledAt || this.resolvedAt || new Date();
  return Math.floor((end - this.createdAt) / 1000);
});

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;