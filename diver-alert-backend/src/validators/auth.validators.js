/**
 * src/validators/auth.validators.js
 *
 * Règles de validation express-validator pour les routes d'authentification.
 * Utilisées dans auth.routes.js :
 *   router.post('/register', registerRules, validate, authController.register);
 *   router.post('/login',    loginRules,    validate, authController.login);
 */

const { body } = require('express-validator');

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom est obligatoire')
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),

  body('email')
    .trim()
    .notEmpty().withMessage("L'email est obligatoire")
    .isEmail().withMessage("Format d'email invalide")
    .normalizeEmail(), // Convertit en minuscules, supprime les alias Gmail (+tag)

  body('password')
    .notEmpty().withMessage('Le mot de passe est obligatoire')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le mot de passe doit contenir au moins une lettre majuscule')
    .matches(/[0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un chiffre'),

  body('role')
    .optional()
    .trim()
    .isIn(['diver', 'rescuer'])
    .withMessage("Rôle invalide — valeurs acceptées : 'diver', 'rescuer'"),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage("L'email est obligatoire")
    .isEmail().withMessage("Format d'email invalide")
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Le mot de passe est obligatoire'),
  // Pas de validation de force ici : le message d'erreur "identifiants invalides"
  // ne doit pas révéler si c'est l'email ou le mot de passe qui est incorrect
];

module.exports = { registerRules, loginRules };