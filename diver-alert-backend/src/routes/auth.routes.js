const express = require('express');

const { register, login, getMe }   = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validators');
const { validate }                  = require('../middlewares/validate.middleware');
const { protect }                   = require('../middlewares/auth.middleware');

const router = express.Router();

// Routes publiques
router.post('/register', registerRules, validate, register);
router.post('/login',    loginRules,    validate, login);

// Route protégée — nécessite un JWT valide
router.get('/me', protect, getMe);

module.exports = router;