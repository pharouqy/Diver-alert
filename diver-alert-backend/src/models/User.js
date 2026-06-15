/**
 * src/models/User.js
 *
 * Schéma Mongoose pour un plongeur.
 * Points clés de sécurité :
 *  — select: false sur password → jamais retourné par défaut dans les requêtes
 *  — pre-save hook → mot de passe haché automatiquement avant chaque sauvegarde
 *  — toJSON transform → supprime password et __v de toute sérialisation JSON
 *  — comparePassword() → méthode d'instance pour vérifier le mot de passe à la connexion
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// 12 rounds : ~250ms par hachage — bon équilibre sécurité/performance pour un MVP
// (10 = minimum acceptable, 14+ = trop lent pour une API web)
const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom est obligatoire'],
      trim: true,
      minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
    },

    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,     // Crée automatiquement un index unique en base
      lowercase: true,  // Stocké en minuscules — évite les doublons de casse
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Format d'email invalide",
      ],
    },

    password: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire'],
      minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
      select: false,    // Exclu de TOUTES les requêtes par défaut
                        // Pour le récupérer : User.findOne(...).select('+password')
    },

    role: {
      type: String,
      enum: {
        values: ['diver', 'rescuer'],
        message: "Rôle invalide — valeurs acceptées : 'diver', 'rescuer'",
      },
      default: 'diver',
    },

    // ── Présence temps réel ──────────────────────────────────────────────────
    // Mis à jour par Socket.io à chaque émission de position
    lastSeen: {
      type: Date,
      default: null,
    },

    // Indique si le plongeur est actuellement connecté via Socket.io
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Ajoute automatiquement createdAt et updatedAt
    timestamps: true,

    // Transformation appliquée lors de toute sérialisation JSON (res.json(), etc.)
    toJSON: {
      transform(doc, ret) {
        delete ret.password; // Double protection — ne doit JAMAIS fuiter
        delete ret.__v;      // Champ interne Mongoose — inutile côté client
        return ret;
      },
    },
  }
);

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Hachage du mot de passe avant chaque sauvegarde.
 *
 * isModified('password') est critique : sans cette vérification,
 * le mot de passe serait re-haché à chaque update (même non lié au MDP),
 * rendant les connexions futures impossibles.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

// ─── Méthodes d'instance ─────────────────────────────────────────────────────

/**
 * Compare un mot de passe en clair avec le hash stocké.
 *
 * Usage dans le contrôleur de connexion :
 *   const user = await User.findByEmailWithPassword(email);
 *   const isValid = await user.comparePassword(passwordFromRequest);
 *
 * Note : bcrypt.compare() est résistant aux timing attacks —
 * il compare en temps constant même si les chaînes diffèrent tôt.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Méthodes statiques ───────────────────────────────────────────────────────

/**
 * Recherche un utilisateur par email ET récupère son mot de passe haché.
 * Centralise l'usage de .select('+password') pour éviter les oublis.
 *
 * Usage : const user = await User.findByEmailWithPassword('email@ex.com');
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password');
};

const User = mongoose.model('User', userSchema);

module.exports = User;