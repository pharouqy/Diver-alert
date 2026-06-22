/**
 * src/models/Product.js
 *
 * Schéma Mongoose pour une annonce de la marketplace (matériel ou récolte).
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "Le propriétaire de l'annonce est obligatoire"],
      index: true,
    },

    type: {
      type: String,
      enum: {
        values: ['equipment', 'catch'],
        message: "Type d'annonce invalide — valeurs acceptées : 'equipment', 'catch'",
      },
      required: [true, "Le type de l'annonce est obligatoire"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Le titre de l'annonce est obligatoire"],
      trim: true,
      minlength: [3, "Le titre doit contenir au moins 3 caractères"],
      maxlength: [100, "Le titre ne peut pas dépasser 100 caractères"],
    },

    description: {
      type: String,
      required: [true, "La description de l'annonce est obligatoire"],
      trim: true,
      maxlength: [1000, "La description ne peut pas dépasser 1000 caractères"],
    },

    price: {
      type: Number,
      required: [true, "Le prix est obligatoire"],
      min: [0, "Le prix ne peut pas être négatif"],
    },

    quantity: {
      type: Number,
      required: [true, "La quantité est obligatoire"],
      min: [0, "La quantité ne peut pas être négative"],
      default: 1,
    },

    unit: {
      type: String,
      trim: true,
      default: null,
    },

    photos: {
      type: [String],
      default: [],
    },

    phone: {
      type: String,
      trim: true,
      default: null,
      maxlength: [30, 'Le numéro de téléphone ne peut pas dépasser 30 caractères'],
    },

    status: {
      type: String,
      enum: {
        values: ['available', 'sold', 'archived'],
        message: "Statut invalide — valeurs acceptées : 'available', 'sold', 'archived'",
      },
      default: 'available',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Tri par défaut : les annonces les plus récentes en premier
productSchema.index({ createdAt: -1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
