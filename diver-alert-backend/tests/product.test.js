/**
 * tests/product.test.js
 *
 * Suite de tests unitaires/d'intégration pour les endpoints CRUD de la marketplace.
 * Utilise le test runner natif de Node.js (node:test) et l'assertion native (node:assert).
 * Aucune dépendance externe lourde requise.
 */

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/diver-alert-test';
process.env.JWT_SECRET = '0edf667b7f59369b89f9bacf3a610445e1692d5bff510e4c3a4a5c821b354a4e';
process.env.JWT_EXPIRES_IN = '1d';
process.env.CLIENT_URL = 'http://localhost:5173';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { connectDB } = require('../src/config/db');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');

describe('Marketplace CRUD API', () => {
  let server;
  let port;
  let userA, userB;
  let tokenA, tokenB;

  before(async () => {
    // Connexion à la base de test
    await connectDB();

    // Démarrage du serveur sur un port dynamique (0)
    server = app.listen(0);
    port = server.address().port;
  });

  after(async () => {
    // Fermeture du serveur et de la base de données
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Nettoyer les collections
    await User.deleteMany({});
    await Product.deleteMany({});

    // Créer deux utilisateurs de test
    userA = await User.create({
      name: 'User A',
      email: 'usera@test.com',
      password: 'Password123!',
      role: 'diver',
    });
    tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET);

    userB = await User.create({
      name: 'User B',
      email: 'userb@test.com',
      password: 'Password123!',
      role: 'diver',
    });
    tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET);
  });

  describe('POST /api/products (Création)', () => {
    it('devrait créer une annonce avec des données valides', async () => {
      const payload = {
        type: 'equipment',
        title: 'Combinaison Néoprène 5mm',
        description: 'Excellent état, peu servie.',
        price: 120,
        quantity: 1,
        unit: 'pièce',
        photos: ['https://example.com/photo1.jpg'],
      };

      const res = await fetch(`http://localhost:${port}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.status, 'success');
      assert.strictEqual(body.data.product.title, payload.title);
      assert.strictEqual(body.data.product.owner, userA._id.toString());
      assert.strictEqual(body.data.product.status, 'available');
    });

    it('devrait renvoyer 422 si des données obligatoires sont manquantes', async () => {
      const payload = {
        type: 'equipment',
        // title manquant
        description: 'Sans titre.',
        price: -50, // Prix négatif invalide
        quantity: 1,
      };

      const res = await fetch(`http://localhost:${port}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      assert.strictEqual(res.status, 422);
      assert.strictEqual(body.status, 'error');
      assert.ok(Array.isArray(body.errors));
    });

    it('devrait renvoyer 401 si aucun token n\'est fourni', async () => {
      const res = await fetch(`http://localhost:${port}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      assert.strictEqual(res.status, 401);
    });
  });

  describe('GET /api/products (Lecture liste)', () => {
    it('devrait lister uniquement les annonces "available" par défaut', async () => {
      // Créer plusieurs annonces
      await Product.create({
        owner: userA._id,
        type: 'equipment',
        title: 'Masque',
        description: 'Visière claire',
        price: 30,
        quantity: 1,
        status: 'available',
      });

      await Product.create({
        owner: userA._id,
        type: 'catch',
        title: 'Daurade',
        description: 'Pêche du jour',
        price: 15,
        quantity: 2,
        status: 'sold',
      });

      const res = await fetch(`http://localhost:${port}/api/products`, {
        headers: {
          'Authorization': `Bearer ${tokenB}`,
        },
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.data.products.length, 1);
      assert.strictEqual(body.data.products[0].title, 'Masque');
    });

    it('devrait filtrer par type', async () => {
      await Product.create({ owner: userA._id, type: 'equipment', title: 'Palmes', description: 'T42', price: 40, quantity: 1 });
      await Product.create({ owner: userA._id, type: 'catch', title: 'Poulpe', description: 'Frais', price: 20, quantity: 1 });

      const res = await fetch(`http://localhost:${port}/api/products?type=catch`, {
        headers: {
          'Authorization': `Bearer ${tokenB}`,
        },
      });

      const body = await res.json();
      assert.strictEqual(body.data.products.length, 1);
      assert.strictEqual(body.data.products[0].title, 'Poulpe');
    });
  });

  describe('GET /api/products/:id (Lecture détail)', () => {
    it('devrait renvoyer les détails d\'une annonce existante', async () => {
      const prod = await Product.create({
        owner: userA._id,
        type: 'equipment',
        title: 'Plomb de lestage',
        description: '2kg',
        price: 10,
        quantity: 4,
      });

      const res = await fetch(`http://localhost:${port}/api/products/${prod._id}`, {
        headers: {
          'Authorization': `Bearer ${tokenB}`,
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.data.product.title, 'Plomb de lestage');
      assert.strictEqual(body.data.product.owner.name, 'User A');
    });

    it('devrait renvoyer 404 si l\'annonce n\'existe pas', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await fetch(`http://localhost:${port}/api/products/${fakeId}`, {
        headers: {
          'Authorization': `Bearer ${tokenB}`,
        },
      });

      assert.strictEqual(res.status, 404);
    });
  });

  describe('PATCH /api/products/:id (Mise à jour)', () => {
    it('devrait autoriser le propriétaire à modifier son annonce', async () => {
      const prod = await Product.create({
        owner: userA._id,
        type: 'equipment',
        title: 'Tuba de plongée',
        description: 'Noir',
        price: 8,
        quantity: 1,
      });

      const res = await fetch(`http://localhost:${port}/api/products/${prod._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ price: 6, status: 'sold' }),
      });

      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.data.product.price, 6);
      assert.strictEqual(body.data.product.status, 'sold');
    });

    it('devrait interdire à un tiers de modifier l\'annonce', async () => {
      const prod = await Product.create({
        owner: userA._id,
        type: 'equipment',
        title: 'Tuba de plongée',
        description: 'Noir',
        price: 8,
        quantity: 1,
      });

      const res = await fetch(`http://localhost:${port}/api/products/${prod._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`, // User B modifie l'annonce de User A
        },
        body: JSON.stringify({ price: 2 }),
      });

      assert.strictEqual(res.status, 403);
    });
  });

  describe('DELETE /api/products/:id (Suppression)', () => {
    it('devrait interdire à un tiers de supprimer l\'annonce', async () => {
      const prod = await Product.create({
        owner: userA._id,
        type: 'equipment',
        title: 'Couteau de plongée',
        description: 'Inox',
        price: 35,
        quantity: 1,
      });

      const res = await fetch(`http://localhost:${port}/api/products/${prod._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenB}`, // User B tente de supprimer l'annonce de User A
        },
      });

      assert.strictEqual(res.status, 403);
    });

    it('devrait autoriser le propriétaire à supprimer son annonce', async () => {
      const prod = await Product.create({
        owner: userA._id,
        type: 'equipment',
        title: 'Couteau de plongée',
        description: 'Inox',
        price: 35,
        quantity: 1,
      });

      const res = await fetch(`http://localhost:${port}/api/products/${prod._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
        },
      });

      assert.strictEqual(res.status, 200);

      // Vérifier que le produit n'existe plus
      const checkRes = await fetch(`http://localhost:${port}/api/products/${prod._id}`, {
        headers: {
          'Authorization': `Bearer ${tokenA}`,
        },
      });
      assert.strictEqual(checkRes.status, 404);
    });
  });
});
