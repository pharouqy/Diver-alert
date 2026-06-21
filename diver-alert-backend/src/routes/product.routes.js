/**
 * src/routes/product.routes.js
 *
 * Routes de l'API REST pour la marketplace (Product).
 */

const express = require('express');

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');

const { protect } = require('../middlewares/auth.middleware');
const { createProductRules, updateProductRules } = require('../validators/product.validators');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

// Toutes les routes du module marketplace nécessitent une authentification
router.use(protect);

router.get('/', getProducts);
router.post('/', createProductRules, validate, createProduct);
router.get('/:id', getProductById);
router.patch('/:id', updateProductRules, validate, updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
