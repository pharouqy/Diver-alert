/**
 * src/controllers/product.controller.js
 *
 * Contrôleur pour le CRUD de la marketplace (Product).
 */

const Product = require('../models/Product');

/**
 * Créer une nouvelle annonce.
 * POST /api/products
 */
const createProduct = async (req, res, next) => {
  try {
    const { type, title, description, price, quantity, unit, photos, phone } = req.body;

    const product = await Product.create({
      owner: req.user._id,
      type,
      title,
      description,
      price,
      quantity,
      unit,
      photos,
      phone,
    });

    res.status(201).json({
      status: 'success',
      data: { product },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Récupérer la liste des annonces avec filtres optionnels et pagination.
 * GET /api/products
 */
const getProducts = async (req, res, next) => {
  try {
    const { type, status, owner, page = 1, limit = 20 } = req.query;

    const filter = {};

    // Filtrer par type (equipment / catch)
    if (type && ['equipment', 'catch'].includes(type)) {
      filter.type = type;
    }

    // Filtrer par propriétaire
    if (owner) {
      filter.owner = owner;
    }

    // Filtrer par statut (available / sold / archived)
    if (status && ['available', 'sold', 'archived'].includes(status)) {
      filter.status = status;
    } else if (!owner) {
      // Par défaut pour le public, n'afficher que les annonces disponibles
      filter.status = 'available';
    }

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('owner', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          pages: Math.ceil(total / parsedLimit),
          hasNext: parsedPage * parsedLimit < total,
          hasPrev: parsedPage > 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Récupérer les détails d'une annonce spécifique par ID.
 * GET /api/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('owner', 'name email role')
      .lean();

    if (!product) {
      const err = new Error('Annonce introuvable');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mettre à jour une annonce (propriétaire uniquement).
 * PATCH /api/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const product = await Product.findById(req.params.id);

    if (!product) {
      const err = new Error('Annonce introuvable');
      err.statusCode = 404;
      return next(err);
    }

    // Vérifier la propriété de l'annonce
    if (product.owner.toString() !== userId) {
      const err = new Error("Vous n'êtes pas autorisé à modifier cette annonce");
      err.statusCode = 403;
      return next(err);
    }

    // Mettre à jour les champs autorisés
    const allowedFields = ['type', 'title', 'description', 'price', 'quantity', 'unit', 'photos', 'phone', 'status'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    // Re-récupérer avec le populate pour la cohérence
    const updatedProduct = await Product.findById(product._id)
      .populate('owner', 'name email role')
      .lean();

    res.status(200).json({
      status: 'success',
      data: { product: updatedProduct },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Supprimer une annonce (propriétaire uniquement).
 * DELETE /api/products/:id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const product = await Product.findById(req.params.id);

    if (!product) {
      const err = new Error('Annonce introuvable');
      err.statusCode = 404;
      return next(err);
    }

    // Vérifier la propriété de l'annonce
    if (product.owner.toString() !== userId) {
      const err = new Error("Vous n'êtes pas autorisé à supprimer cette annonce");
      err.statusCode = 403;
      return next(err);
    }

    await product.deleteOne();

    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
