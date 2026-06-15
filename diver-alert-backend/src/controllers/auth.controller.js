/**
 * src/controllers/auth.controller.js
 *
 * Contrôleur d'authentification — register et login.
 * Les données d'entrée sont déjà validées par express-validator
 * avant d'arriver ici (via registerRules/loginRules + validate dans les routes).
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

// ─── Utilitaire interne ───────────────────────────────────────────────────────

/**
 * Génère un JWT signé pour un utilisateur.
 * Le payload contient uniquement l'ID — jamais le mot de passe ou l'email.
 *
 * @param {string} userId - ObjectId MongoDB de l'utilisateur
 * @returns {string} Token JWT signé
 */
const generateToken = (userId) =>
  jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

/**
 * Formate les données utilisateur à retourner dans les réponses.
 * Exclut explicitement le mot de passe même si select: false a été contourné.
 */
const formatUser = (user) => ({
  id:        user._id,
  name:      user.name,
  email:     user.email,
  role:      user.role,
  isOnline:  user.isOnline,
  lastSeen:  user.lastSeen,
  createdAt: user.createdAt,
});

// ─── Contrôleurs ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Inscription d'un nouveau plongeur.
 *
 * Body attendu : { name, email, password, role? }
 * Réponse 201  : { status, data: { user, token } }
 * Réponse 409  : email déjà utilisé
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Vérification préalable — le hook unique de Mongoose est une sécurité,
    // mais ce check donne un message d'erreur plus précis et évite d'invoquer
    // le hachage bcrypt pour rien
    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error('Un compte avec cet email existe déjà');
      err.statusCode = 409;
      return next(err);
    }

    // Création — le hook pre-save hache automatiquement le mot de passe
    const user = await User.create({ name, email, password, role });

    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      data: {
        user: formatUser(user),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Connexion d'un plongeur existant.
 *
 * Body attendu : { email, password }
 * Réponse 200  : { status, data: { user, token } }
 * Réponse 401  : identifiants invalides (message identique email introuvable ou mdp erroné)
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // findByEmailWithPassword : méthode statique du modèle User qui fait .select('+password')
    const user = await User.findByEmailWithPassword(email);

    // Message volontairement identique dans les deux cas :
    // ne révèle pas si c'est l'email ou le mot de passe qui est incorrect
    if (!user) {
      const err = new Error('Identifiants invalides');
      err.statusCode = 401;
      return next(err);
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      const err = new Error('Identifiants invalides');
      err.statusCode = 401;
      return next(err);
    }

    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      data: {
        user: formatUser(user),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Retourne le profil de l'utilisateur actuellement connecté.
 * req.user est injecté par le middleware protect.
 * Utile pour le frontend au chargement initial (vérifier si le token est encore valide).
 */
const getMe = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: formatUser(req.user) },
  });
};

module.exports = { register, login, getMe };