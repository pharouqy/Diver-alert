import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function ProductFormModal({ product, onClose, onSuccess }) {
  const isEdit = !!product;

  const [type, setType] = useState('equipment');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('available');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({}); // Pour stocker les erreurs de validation par champ

  // Charger les données si on est en mode édition
  useEffect(() => {
    if (product) {
      setType(product.type || 'equipment');
      setTitle(product.title || '');
      setDescription(product.description || '');
      setPrice(product.price ? String(product.price) : '');
      setQuantity(product.quantity ? String(product.quantity) : '1');
      setUnit(product.unit || '');
      setPhotoUrl(product.photos && product.photos.length > 0 ? product.photos[0] : '');
      setPhone(product.phone || '');
      setStatus(product.status || 'available');
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrors({});

    // Construction du payload
    const payload = {
      type,
      title,
      description,
      price: parseFloat(price) || 0,
      quantity: parseFloat(quantity) || 1,
      unit: unit.trim() || null,
      photos: photoUrl.trim() ? [photoUrl.trim()] : [],
      phone: phone.trim() || null,
    };

    if (isEdit) {
      payload.status = status;
    }

    try {
      if (isEdit) {
        await api.patch(`/products/${product._id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        // Erreurs de validation express-validator
        const validationErrors = {};
        err.response.data.errors.forEach((e) => {
          validationErrors[e.field] = e.message;
        });
        setErrors(validationErrors);
      } else {
        setError(err.response?.data?.message || "Une erreur est survenue lors de l'enregistrement.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce définitivement ?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.delete(`/products/${product._id}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la suppression de l'annonce.");
      setLoading(false);
    }
  };

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        {/* En-tête */}
        <header style={S.header}>
          <h2 style={S.title}>
            {isEdit ? "Modifier l'annonce" : 'Créer une annonce'}
          </h2>
          <button onClick={onClose} style={S.btnClose} disabled={loading}>✕</button>
        </header>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={S.form}>
          {error && <div style={S.errorAlert}>{error}</div>}

          {/* Type d'annonce */}
          <div style={S.formGroup}>
            <label style={S.label}>Type de vente *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={S.input}
              required
            >
              <option value="equipment">🤿 Matériel de plongée / Pêche</option>
              <option value="catch">🐟 Récolte de pêche sous-marine</option>
            </select>
            {errors.type && <span style={S.fieldError}>{errors.type}</span>}
          </div>

          {/* Titre */}
          <div style={S.formGroup}>
            <label style={S.label}>Titre de l'annonce *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Palmes carbone Omer T42"
              style={S.input}
              required
            />
            {errors.title && <span style={S.fieldError}>{errors.title}</span>}
          </div>

          {/* Description */}
          <div style={S.formGroup}>
            <label style={S.label}>Description détaillée *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'état, la taille, ou la fraîcheur du poisson..."
              style={S.textarea}
              required
            />
            {errors.description && <span style={S.fieldError}>{errors.description}</span>}
          </div>

          {/* Prix, Quantité, Unité */}
          <div style={S.row}>
            <div style={{ ...S.formGroup, flex: 1 }}>
              <label style={S.label}>Prix (€) *</label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                style={S.input}
                required
              />
              {errors.price && <span style={S.fieldError}>{errors.price}</span>}
            </div>

            <div style={{ ...S.formGroup, flex: 1 }}>
              <label style={S.label}>Quantité *</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={S.input}
                required
              />
              {errors.quantity && <span style={S.fieldError}>{errors.quantity}</span>}
            </div>

            <div style={{ ...S.formGroup, flex: 1 }}>
              <label style={S.label}>Unité (optionnel)</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, pièce, lot..."
                style={S.input}
              />
              {errors.unit && <span style={S.fieldError}>{errors.unit}</span>}
            </div>
          </div>

          {/* URL Photo */}
          <div style={S.formGroup}>
            <label style={S.label}>Lien de l'image (optionnel)</label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              style={S.input}
            />
            {errors.photos && <span style={S.fieldError}>{errors.photos}</span>}
          </div>

          {/* Statut (édition seulement) */}
          {isEdit && (
            <div style={S.formGroup}>
              <label style={S.label}>Statut de l'annonce</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={S.input}
              >
                <option value="available">Disponible</option>
                <option value="sold">Vendu</option>
                <option value="archived">Archivé</option>
              </select>
              {errors.status && <span style={S.fieldError}>{errors.status}</span>}
            </div>
          )}

          {/* Actions */}
          <div style={S.footer}>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                style={S.btnDelete}
                disabled={loading}
              >
                🗑 Supprimer
              </button>
            )}
            <div style={S.rightActions}>
              <button
                type="button"
                onClick={onClose}
                style={S.btnCancel}
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                style={S.btnSubmit}
                disabled={loading}
              >
                {loading ? 'Enregistrement...' : isEdit ? 'Sauvegarder' : 'Publier'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(5, 12, 22, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2100,
    padding: '1rem',
  },
  modal: {
    background: 'var(--color-ocean-mid)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '550px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--color-border)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  form: {
    padding: '1.25rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  row: {
    display: 'flex',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
  },
  input: {
    background: 'var(--color-ocean-deep)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
  },
  textarea: {
    background: 'var(--color-ocean-deep)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    outline: 'none',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    width: '100%',
  },
  fieldError: {
    fontSize: '0.75rem',
    color: 'var(--color-danger)',
  },
  errorAlert: {
    background: 'rgba(255, 59, 59, 0.1)',
    border: '1px solid var(--color-danger)',
    color: 'var(--color-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '1rem',
    marginTop: '0.5rem',
  },
  rightActions: {
    display: 'flex',
    gap: '0.5rem',
    marginLeft: 'auto',
  },
  btnCancel: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
  },
  btnSubmit: {
    background: 'var(--color-accent)',
    color: 'var(--color-ocean-deep)',
    fontWeight: 600,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 1.25rem',
    fontSize: '0.85rem',
  },
  btnDelete: {
    background: 'rgba(255, 59, 59, 0.1)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-danger)',
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
  },
};
