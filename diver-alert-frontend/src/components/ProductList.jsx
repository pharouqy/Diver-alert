import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ProductDetailModal from './ProductDetailModal';
import ProductFormModal from './ProductFormModal';
import { useAuth } from '../context/AuthContext';

export default function ProductList({ refreshTrigger, onContactSeller }) {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/products';
      if (filterType !== 'all') {
        url += `?type=${filterType}`;
      }
      const { data } = await api.get(url);
      setProducts(data.data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des annonces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filterType, refreshTrigger, localRefreshTrigger]);

  return (
    <div style={S.container}>
      {/* Barre de filtres et d'actions */}
      <div style={S.toolbar}>
        <div style={S.filters}>
          <button
            style={filterType === 'all' ? S.btnFilterActive : S.btnFilter}
            onClick={() => setFilterType('all')}
          >
            Tout
          </button>
          <button
            style={filterType === 'equipment' ? S.btnFilterActive : S.btnFilter}
            onClick={() => setFilterType('equipment')}
          >
            🤿 Matériel
          </button>
          <button
            style={filterType === 'catch' ? S.btnFilterActive : S.btnFilter}
            onClick={() => setFilterType('catch')}
          >
            🐟 Récolte
          </button>
        </div>

        <div style={S.actions}>
          <button onClick={fetchProducts} style={S.btnSecondary} title="Rafraîchir">
            🔄
          </button>
          <button onClick={() => { setProductToEdit(null); setIsFormOpen(true); }} style={S.btnPrimary}>
            ＋ Publier une annonce
          </button>
        </div>
      </div>

      {/* États de chargement et d'erreur */}
      {loading && (
        <div style={S.loading}>
          <span>⏳ Chargement des annonces...</span>
        </div>
      )}

      {error && (
        <div style={S.error}>
          <span>⚠️ {error}</span>
          <button onClick={fetchProducts} style={S.btnRetry}>Réessayer</button>
        </div>
      )}

      {/* Contenu vide */}
      {!loading && !error && products.length === 0 && (
        <div style={S.emptyState}>
          <p>Aucune annonce disponible pour le moment.</p>
        </div>
      )}

      {/* Grille d'annonces */}
      {!loading && !error && products.length > 0 && (
        <div style={S.grid}>
          {products.map((product) => {
            const isCatch = product.type === 'catch';
            const ownerId = product.owner?._id || product.owner;
            const isOwner = currentUserId && ownerId && currentUserId.toString() === ownerId.toString();
            return (
              <div key={product._id} style={{ ...S.card, borderColor: isOwner ? 'var(--color-warning)' : 'var(--color-border)' }}>
                {/* Photo / Vignette */}
                {product.photos && product.photos.length > 0 ? (
                  <div style={S.cardPhotoContainer}>
                    <img src={product.photos[0]} alt={product.title} style={S.cardPhoto} />
                  </div>
                ) : (
                  <div style={S.cardPlaceholder}>
                    <span style={S.placeholderEmoji}>{isCatch ? '🐟' : '🤿'}</span>
                  </div>
                )}

                {/* Infos carte */}
                <div style={S.cardBody}>
                  <div style={S.cardHeaderRow}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <span style={S.cardTypeTag}>
                        {isCatch ? 'Récolte' : 'Matériel'}
                      </span>
                      {isOwner && (
                        <span style={{ ...S.cardTypeTag, background: 'var(--color-warning)', color: 'var(--color-ocean-deep)', fontWeight: 600 }}>
                          Mienne
                        </span>
                      )}
                    </div>
                    <span style={S.cardPrice}>
                      {product.price} € {product.unit ? `/ ${product.unit}` : ''}
                    </span>
                  </div>

                  <h3 style={S.cardTitle}>{product.title}</h3>
                  <p style={S.cardDescription}>{product.description}</p>

                  <div style={S.cardFooter}>
                    <span style={S.cardSeller}>👤 {product.owner?.name || 'Plongeur'}</span>
                    <button
                      onClick={() => setSelectedProduct(product)}
                      style={S.btnDetails}
                    >
                      Détails
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Détail */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onContactSeller={(product) => {
            onContactSeller?.(product);
            setSelectedProduct(null);
          }}
          onEditClick={() => {
            setProductToEdit(selectedProduct);
            setIsFormOpen(true);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Modal Formulaire (Création / Édition) */}
      {isFormOpen && (
        <ProductFormModal
          product={productToEdit}
          onClose={() => { setIsFormOpen(false); setProductToEdit(null); }}
          onSuccess={() => setLocalRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </div>
  );
}

const S = {
  container: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
    flex: 1,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  filters: {
    display: 'flex',
    gap: '0.5rem',
  },
  btnFilter: {
    background: 'var(--color-ocean-light)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.85rem',
  },
  btnFilterActive: {
    background: 'var(--color-accent)',
    color: 'var(--color-ocean-deep)',
    fontWeight: 600,
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.85rem',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  btnPrimary: {
    background: 'var(--color-accent)',
    color: 'var(--color-ocean-deep)',
    fontWeight: 600,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
  },
  btnSecondary: {
    background: 'var(--color-ocean-light)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: 'var(--color-text-muted)',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '2rem',
    background: 'rgba(255, 59, 59, 0.1)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-danger)',
  },
  btnRetry: {
    background: 'var(--color-danger)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.25rem 0.75rem',
    fontSize: '0.8rem',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    color: 'var(--color-text-muted)',
    border: '2px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: 'var(--color-ocean-mid)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.15s, border-color 0.15s',
  },
  cardPhotoContainer: {
    height: '140px',
    borderBottom: '1px solid var(--color-border)',
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardPlaceholder: {
    height: '140px',
    background: 'var(--color-ocean-light)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: '2.5rem',
  },
  cardBody: {
    padding: '0.875rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTypeTag: {
    fontSize: '0.7rem',
    background: 'var(--color-ocean-light)',
    color: 'var(--color-text-muted)',
    padding: '0.15rem 0.4rem',
    borderRadius: 'var(--radius-sm)',
  },
  cardPrice: {
    fontWeight: 700,
    color: 'var(--color-accent)',
    fontSize: '0.95rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.3,
    color: 'var(--color-text)',
  },
  cardDescription: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: 1.4,
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.5rem',
    borderTop: '1px solid rgba(45, 74, 107, 0.3)',
    paddingTop: '0.5rem',
  },
  cardSeller: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '120px',
  },
  btnDetails: {
    background: 'var(--color-ocean-light)',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
};
