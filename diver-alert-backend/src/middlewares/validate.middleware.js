/**
 * src/middlewares/validate.middleware.js
 *
 * Middleware générique à chaîner après les règles express-validator.
 * Collecte les erreurs de validation et les passe au errorHandler centralisé.
 *
 * Pattern d'utilisation dans une route :
 *   router.post('/register', registerRules, validate, authController.register);
 *                             ↑ règles        ↑ ce middleware   ↑ contrôleur
 *
 * Si des erreurs existent → 422 Unprocessable Entity avec la liste des champs invalides.
 * Si aucune erreur → next() — le contrôleur est appelé.
 */

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
        const err = new Error('Données invalides');
        err.statusCode = 422;
        // Format normalisé : [{ field: 'email', message: 'Format invalide' }, ...]
        err.errors = result.array().map((e) => ({
            field: e.path,
            message: e.msg,
        }));
        return next(err);
    }

    next();
};

module.exports = { validate };