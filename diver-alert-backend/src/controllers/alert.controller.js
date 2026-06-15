/**
 * src/controllers/alert.controller.js
 *
 * 4 endpoints REST pour la gestion de l'historique des alertes :
 *
 *  GET  /api/alerts          — liste paginée (filtre optionnel par status)
 *  GET  /api/alerts/mine     — alertes de l'utilisateur connecté
 *  GET  /api/alerts/:id      — détail d'une alerte
 *  PATCH /api/alerts/:id/status — annuler ou résoudre une alerte (propriétaire uniquement)
 *
 * Toutes les routes sont protégées par le middleware JWT (protect).
 * Le middleware est appliqué au niveau du router dans alert.routes.js.
 */

const Alert = require('../models/Alert');

// ─── GET /api/alerts ─────────────────────────────────────────────────────────

/**
 * Liste paginée des alertes avec filtre optionnel par statut.
 * Query params :
 *   status  — 'active' | 'cancelled' | 'resolved' (optionnel)
 *   limit   — nombre de résultats par page (défaut : 20, max : 100)
 *   page    — page demandée (défaut : 1)
 */
const getAlerts = async (req, res, next) => {
    try {
        const VALID_STATUSES = ['active', 'cancelled', 'resolved'];
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const status = VALID_STATUSES.includes(req.query.status)
            ? req.query.status
            : null;

        const filter = status ? { status } : {};
        const skip = (page - 1) * limit;

        // Promise.all : exécuter le find et le count en parallèle
        const [alerts, total] = await Promise.all([
            Alert.find(filter)
                .populate('emitter', 'name email role')  // Exclut le mot de passe automatiquement
                .sort({ createdAt: -1 })                 // Plus récentes en premier
                .skip(skip)
                .limit(limit)
                .lean(),                                  // Objet JS pur — plus rapide en lecture seule
            Alert.countDocuments(filter),
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                alerts,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/alerts/mine ─────────────────────────────────────────────────────

/**
 * Alertes émises par l'utilisateur connecté uniquement.
 * Limitées à 50 résultats — suffisant pour un historique personnel.
 */
const getMyAlerts = async (req, res, next) => {
    try {
        const alerts = await Alert.find({ emitter: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.status(200).json({
            status: 'success',
            data: {
                count: alerts.length,
                alerts,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/alerts/:id ──────────────────────────────────────────────────────

/**
 * Détail complet d'une alerte par son ID MongoDB.
 * Peuple les données de l'émetteur (nom, email, rôle).
 * CastError (ID malformé) → géré par errorHandler → 400
 */
const getAlertById = async (req, res, next) => {
    try {
        const alert = await Alert.findById(req.params.id)
            .populate('emitter', 'name email role')
            .lean();

        if (!alert) {
            const err = new Error('Alerte introuvable');
            err.statusCode = 404;
            return next(err);
        }

        res.status(200).json({
            status: 'success',
            data: { alert },
        });
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/alerts/:id/status ────────────────────────────────────────────

/**
 * Met à jour le statut d'une alerte active.
 * Règles :
 *  — Seul l'émetteur peut modifier son alerte (403 sinon)
 *  — L'alerte doit être 'active' (409 sinon)
 *  — status accepté : 'cancelled' | 'resolved'
 *
 * Complément REST au canal Socket.io (alert:cancel) :
 * utilisé si le socket est déconnecté ou pour les admins.
 */
const updateAlertStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const userId = req.user._id.toString();

        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            const err = new Error('Alerte introuvable');
            err.statusCode = 404;
            return next(err);
        }

        // Vérification de propriété
        if (alert.emitter.toString() !== userId) {
            const err = new Error("Seul l'émetteur peut modifier son alerte");
            err.statusCode = 403;
            return next(err);
        }

        // Vérification du statut courant
        if (alert.status !== 'active') {
            const err = new Error(`L'alerte est déjà « ${alert.status} » — aucune modification possible`);
            err.statusCode = 409;
            return next(err);
        }

        // Appel des méthodes d'instance du modèle (définie en étape 7)
        if (status === 'cancelled') await alert.cancel();
        if (status === 'resolved') await alert.resolve();

        res.status(200).json({
            status: 'success',
            data: { alert },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAlerts, getMyAlerts, getAlertById, updateAlertStatus };