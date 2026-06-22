/**
 * src/validators/product.validators.js
 *
 * Règles de validation express-validator pour les annonces du marketplace.
 */

const { body } = require('express-validator');

const createProductRules = [
  body('type')
    .trim()
    .notEmpty().withMessage("Le type d'annonce est obligatoire")
    .isIn(['equipment', 'catch']).withMessage("Type d'annonce invalide — valeurs acceptées : 'equipment', 'catch'"),

  body('title')
    .trim()
    .notEmpty().withMessage("Le titre est obligatoire")
    .isLength({ min: 3, max: 100 }).withMessage("Le titre doit contenir entre 3 et 100 caractères"),

  body('description')
    .trim()
    .notEmpty().withMessage("La description est obligatoire")
    .isLength({ max: 1000 }).withMessage("La description ne peut pas dépasser 1000 caractères"),

  body('price')
    .notEmpty().withMessage("Le prix est obligatoire")
    .isFloat({ min: 0 }).withMessage("Le prix doit être un nombre positif ou nul"),

  body('quantity')
    .notEmpty().withMessage("La quantité est obligatoire")
    .isFloat({ min: 0 }).withMessage("La quantité doit être un nombre positif ou nul"),

  body('unit')
    .optional({ nullable: true })
    .trim()
    .isString().withMessage("L'unité doit être une chaîne de caractères"),

  body('photos')
    .optional()
    .isArray().withMessage("Les photos doivent être un tableau"),

  body('photos.*')
    .optional()
    .trim()
    .isString().withMessage("Chaque photo doit être une URL sous forme de chaîne de caractères"),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isString().withMessage("Le téléphone doit être une chaîne de caractères")
    .isLength({ max: 30 }).withMessage("Le numéro de téléphone ne peut pas dépasser 30 caractères"),
];

const updateProductRules = [
  body('type')
    .optional()
    .trim()
    .isIn(['equipment', 'catch']).withMessage("Type d'annonce invalide — valeurs acceptées : 'equipment', 'catch'"),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage("Le titre doit contenir entre 3 et 100 caractères"),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("La description ne peut pas dépasser 1000 caractères"),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage("Le prix doit être un nombre positif ou nul"),

  body('quantity')
    .optional()
    .isFloat({ min: 0 }).withMessage("La quantité doit être un nombre positif ou nul"),

  body('unit')
    .optional({ nullable: true })
    .trim()
    .isString().withMessage("L'unité doit être une chaîne de caractères"),

  body('photos')
    .optional()
    .isArray().withMessage("Les photos doivent être un tableau"),

  body('photos.*')
    .optional()
    .trim()
    .isString().withMessage("Chaque photo doit être une URL sous forme de chaîne de caractères"),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isString().withMessage("Le téléphone doit être une chaîne de caractères")
    .isLength({ max: 30 }).withMessage("Le numéro de téléphone ne peut pas dépasser 30 caractères"),

  body('status')
    .optional()
    .trim()
    .isIn(['available', 'sold', 'archived']).withMessage("Statut invalide — valeurs acceptées : 'available', 'sold', 'archived'"),
];

module.exports = { createProductRules, updateProductRules };
