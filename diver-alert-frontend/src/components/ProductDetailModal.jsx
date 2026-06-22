import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProductDetailModal({ product, onClose, onEditClick, onContactSeller }) {
  const { user } = useAuth();

  if (!product) return null;

  const currentUserId = user?._id || user?.id;
  const ownerId = product.owner?._id || product.owner;
  const isOwner = currentUserId && ownerId && currentUserId.toString() === ownerId.toString();

  const isCatch = product.type === 'catch';
  const phone = typeof product.phone === 'string' ? product.phone.trim() : '';
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        {/* En-tête */}
        <header style={S.header}>
          <div style={S.titleGroup}>
            <span style={S.typeIcon}>{isCatch ? '🐟' : '🤿'}</span>
            <h2 style={S.title}>{product.title}</h2>
          </div>
          <button onClick={onClose} style={S.btnClose}>✕</button>
        </header>

        {/* Corps */}
        <div style={S.body}>
          {/* Photos */}
          {product.photos && product.photos.length > 0 ? (
            <div style={S.photoContainer}>
              <img src={product.photos[0]} alt={product.title} style={S.photo} />
            </div>
          ) : (
            <div style={S.photoPlaceholder}>
              <span>{isCatch ? 'Récolte fraîche de pêche' : 'Matériel de plongée'}</span>
            </div>
          )}

          {/* Infos principales */}
          <div style={S.metaGrid}>
            <div style={S.metaCard}>
              <span style={S.metaLabel}>Prix</span>
              <span style={S.metaValue}>
                {product.price} € {product.unit ? `/ ${product.unit}` : ''}
              </span>
            </div>

            <div style={S.metaCard}>
              <span style={S.metaLabel}>Quantité disponible</span>
              <span style={S.metaValue}>
                {product.quantity} {product.unit || 'pièce(s)'}
              </span>
            </div>

            <div style={S.metaCard}>
              <span style={S.metaLabel}>Type</span>
              <span style={S.metaValue}>
                {isCatch ? 'Pêche sous-marine' : 'Équipement'}
              </span>
            </div>

            <div style={S.metaCard}>
              <span style={S.metaLabel}>Statut</span>
              <span style={{ ...S.metaValue, color: product.status === 'available' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {product.status === 'available' ? 'Disponible' : product.status === 'sold' ? 'Vendu' : 'Archivé'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div style={S.section}>
            <h3 style={S.sectionTitle}>Description</h3>
            <p style={S.descriptionText}>{product.description}</p>
          </div>

          {/* Vendeur */}
          <div style={S.sellerCard}>
            <div style={S.sellerInfo}>
              <div style={S.avatar}>👤</div>
              <div>
                <div style={S.sellerName}>{product.owner?.name || 'Plongeur anonyme'}</div>
                <div style={S.sellerRole}>
                  {product.owner?.role === 'rescuer' ? '🚨 Sauveteur' : '🤿 Plongeur'}
                </div>
              </div>
            </div>
            {isOwner ? (
              <button
                onClick={onEditClick}
                style={S.editBtn}
              >
                ✏ Modifier l'annonce
              </button>
            ) : (
              <div style={S.contactActions}>
                {onContactSeller && (
                  <button
                    type="button"
                    onClick={() => onContactSeller(product)}
                    style={S.contactBtn}
                  >
                    Message
                  </button>
                )}
                {phoneHref && (
                  <a href={phoneHref} style={S.phoneBtn}>
                    Tel {phone}
                  </a>
                )}
                {product.owner?.email && (
              <a
                href={`mailto:${product.owner?.email}?subject=Intéressé par votre annonce : ${encodeURIComponent(product.title)}`}
                style={S.contactBtn}
              >
                ✉ Contacter le vendeur
              </a>
                )}
              </div>
            )}
          </div>
        </div>
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
    zIndex: 2000,
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
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--color-border)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  typeIcon: {
    fontSize: '1.5rem',
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
  body: {
    padding: '1.25rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  photoContainer: {
    width: '100%',
    height: '220px',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--color-border)',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '150px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-ocean-light)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  metaCard: {
    background: 'var(--color-ocean-light)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  metaLabel: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metaValue: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.25rem',
  },
  descriptionText: {
    fontSize: '0.95rem',
    lineHeight: 1.6,
    color: 'var(--color-text)',
    whiteSpace: 'pre-line',
  },
  sellerCard: {
    background: 'rgba(26, 58, 92, 0.4)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  sellerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--color-ocean-light)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
  },
  sellerName: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  sellerRole: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  contactActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  contactBtn: {
    background: 'var(--color-accent)',
    color: 'var(--color-ocean-deep)',
    fontWeight: 600,
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    textAlign: 'center',
    display: 'inline-block',
    border: 'none',
    cursor: 'pointer',
  },
  phoneBtn: {
    background: 'var(--color-success)',
    color: 'var(--color-ocean-deep)',
    fontWeight: 600,
    padding: '0.5rem 0.875rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    textAlign: 'center',
    display: 'inline-block',
  },
  editBtn: {
    background: 'var(--color-warning)',
    color: 'var(--color-ocean-deep)',
    fontWeight: 600,
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    textAlign: 'center',
    border: 'none',
    cursor: 'pointer',
  },
};
