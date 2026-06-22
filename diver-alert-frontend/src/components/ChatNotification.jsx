/**
 * src/components/ChatNotification.jsx
 *
 * Toast de notification à la réception d'un message privé.
 * Auto-dismiss après 4s. Clic → ouvre le chat avec l'expéditeur.
 */

import React, { useEffect, useRef } from 'react';

export default function ChatNotification({ notification, onOpen, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!notification) return;
    // Auto-dismiss après 4s
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timerRef.current);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const handleClick = () => {
    clearTimeout(timerRef.current);
    onOpen(notification.senderId, notification.senderName);
    onDismiss();
  };

  const truncate = (str, max) =>
    str.length > max ? str.slice(0, max) + '…' : str;

  return (
    <div style={S.toast} onClick={handleClick} role="alert" title="Cliquer pour répondre">
      <div style={S.toastIcon}>💬</div>
      <div style={S.toastBody}>
        <div style={S.toastSender}>{notification.senderName}</div>
        <div style={S.toastContent}>{truncate(notification.content, 80)}</div>
      </div>
      <button
        style={S.btnDismiss}
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        title="Ignorer"
      >
        ✕
      </button>
      {/* Barre de progression */}
      <div style={S.progressBar}>
        <div style={S.progressFill} />
      </div>
    </div>
  );
}

const S = {
  toast: {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    width: '300px',
    background: 'var(--color-ocean-mid)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    padding: '0.875rem',
    zIndex: 4000,
    cursor: 'pointer',
    animation: 'slideInRight 0.2s ease-out',
    overflow: 'hidden',
  },
  toastIcon: {
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  toastBody: {
    flex: 1,
    minWidth: 0,
  },
  toastSender: {
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--color-accent)',
    marginBottom: '0.2rem',
  },
  toastContent: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  btnDismiss: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0.1rem',
    flexShrink: 0,
    lineHeight: 1,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    background: 'var(--color-accent)',
    animation: 'shrink 4s linear forwards',
    width: '100%',
  },
};
