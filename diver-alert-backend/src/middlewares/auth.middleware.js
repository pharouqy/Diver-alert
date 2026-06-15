/**
 * src/middlewares/auth.middleware.js
 *
 * protect     — vérifie le JWT, récupère l'utilisateur, attache à req.user
 * restrictTo  — restreint l'accès à certains rôles (utilisé après protect)
 *
 * Format attendu dans le header HTTP :
 *   Authorization: Bearer <token>
 *
 * Les erreurs JWT (invalide, expiré) sont catchées et passées à errorHandler
 * qui les transforme en 401 propres (JsonWebTokenError, TokenExpiredError).
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

/**
 * Middleware de protection — à placer sur toute route privée.
 *
 * Flux :
 *  1. Extraire le token du header Authorization: Bearer <token>
 *  2. Vérifier la signature et l'expiration avec jwt.verify()
 *  3. Récupérer l'utilisateur en base (vérifie qu'il existe toujours)
 *  4. Attacher l'utilisateur à req.user et appeler next()
 */
const protect = async (req, res, next) => {
    try {
        // ── Étape 1 : extraction du token ────────────────────────────────────────
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const err = new Error('Accès non autorisé — token manquant');
            err.statusCode = 401;
            return next(err);
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            const err = new Error('Accès non autorisé — token vide');
            err.statusCode = 401;
            return next(err);
        }

        // ── Étape 2 : vérification du token ──────────────────────────────────────
        // jwt.verify() est synchrone sans callback.
        // Lève JsonWebTokenError (signature invalide) ou TokenExpiredError (expiré).
        // Ces deux erreurs sont interceptées par le catch et gérées dans errorHandler.
        const decoded = jwt.verify(token, config.jwt.secret);

        // ── Étape 3 : récupération de l'utilisateur ───────────────────────────────
        // Vérifie que le compte existe toujours en base.
        // Cas couverts : compte supprimé après émission du token.
        const user = await User.findById(decoded.id);

        if (!user) {
            const err = new Error('Utilisateur introuvable — token révoqué ou compte supprimé');
            err.statusCode = 401;
            return next(err);
        }

        // ── Étape 4 : injection dans la requête ──────────────────────────────────
        // req.user est disponible dans tous les middlewares et contrôleurs suivants
        req.user = user;
        next();

    } catch (err) {
        // JsonWebTokenError et TokenExpiredError remontent ici
        // errorHandler les transformera en 401 avec un message clair
        next(err);
    }
};

/**
 * Middleware de restriction par rôle.
 * Doit être utilisé APRÈS protect dans la chaîne.
 *
 * @param  {...string} roles - Un ou plusieurs rôles autorisés
 * @returns {Function} Middleware Express
 *
 * Exemples d'usage dans les routes :
 *   router.get('/admin', protect, restrictTo('rescuer'), controller);
 *   router.delete('/alert/:id', protect, restrictTo('rescuer', 'diver'), controller);
 */
const restrictTo = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        const err = new Error(
            `Accès refusé — cette action requiert le rôle : ${roles.join(' ou ')}`
        );
        err.statusCode = 403;
        return next(err);
    }
    next();
};

module.exports = { protect, restrictTo };