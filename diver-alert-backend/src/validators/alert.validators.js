/**
 * src/validators/alert.validators.js
 *
 * Règles de validation pour les routes d'alerte REST.
 * Utilisées dans alert.routes.js.
 */

const { body } = require('express-validator');

// Règles pour la création d'une alerte via POST /api/alerts
const createAlertRules = [
  body('latitude')
    .notEmpty().withMessage('La latitude est obligatoire')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude invalide — valeur entre -90 et 90'),

  body('longitude')
    .notEmpty().withMessage('La longitude est obligatoire')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude invalide — valeur entre -180 et 180'),

  body('accuracy')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('La précision GPS doit être un nombre positif'),

  body('radius')
    .notEmpty().withMessage('Le rayon est obligatoire')
    .isFloat({ min: 0.1, max: 100 })
    .withMessage('Le rayon doit être entre 0.1 et 100 km'),
];

// Règles pour la mise à jour du statut (annulation ou résolution)
const updateAlertStatusRules = [
  body('status')
    .notEmpty().withMessage('Le statut est obligatoire')
    .isIn(['cancelled', 'resolved'])
    .withMessage("Statut invalide — valeurs acceptées : 'cancelled', 'resolved'"),
];

module.exports = { createAlertRules, updateAlertStatusRules };