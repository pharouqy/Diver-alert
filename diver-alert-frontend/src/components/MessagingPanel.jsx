/**
 * src/components/MessagingPanel.jsx
 *
 * Liste des plongeurs disponibles pour la messagerie.
 * Affiche les plongeurs connectés avec leur badge de messages non-lus.
 * Clic → ouvre ChatWindow.
 */

import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function MessagingPanel({ onSelectPeer, onClose }) {
  const { user } = useAuth();
  const { divers, unreadCounts } = useSocket();

  const myId = user?._id || user?.id;
  const others = divers.filter((d) => d.userId !== myId);

  return (
    <div style={S.panel}>
      <header style={S.header}>
        <span style={S.title}>💬 Messagerie</span>
        <button onClick={onClose} style={S.btnClose} title="Fermer">✕</button>
      </header>

      <div style={S.list}>
        {others.length === 0 && (
          <div style={S.empty}>
            <span style={S.emptyIcon}>🌊</span>
            <p>Aucun plongeur en ligne</p>
          </div>
        )}
        {others.map((diver) => {
          const unread = unreadCounts[diver.userId] || 0;
          return (
            <button
              key={diver.userId}
              onClick={() => onSelectPeer(diver)}
              style={S.item}
            >
              <div style={S.itemLeft}>
                <div style={S.avatar}>
                  {diver.role === 'rescuer' ? '🚨' : '🤿'}
                </div>
                <div>
                  <div style={S.name}>{diver.name}</div>
                  <div style={S.role}>
                    {diver.role === 'rescuer' ? 'Sauveteur' : 'Plongeur'} · En ligne
                  </div>
                </div>
              </div>
              {unread > 0 && (
                <span style={S.badge}>{unread > 99 ? '99+' : unread}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const S = {
  panel: {
    position: 'fixed',
    bottom: '5rem',
    right: '1.5rem',
    width: '280px',
    maxHeight: '400px',
    background: 'var(--color-ocean-mid)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 2900,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-ocean-deep)',
  },
  title: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  list: {
    overflowY: 'auto',
    flex: 1,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '2.5rem 1rem',
    color: 'var(--color-text-muted)',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '2rem',
  },
  item: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(45, 74, 107, 0.3)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--color-ocean-light)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  name: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: 'var(--color-text)',
  },
  role: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.1rem',
  },
  badge: {
    background: 'var(--color-danger)',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.1rem 0.4rem',
    borderRadius: '999px',
    minWidth: '18px',
    textAlign: 'center',
    flexShrink: 0,
  },
};
