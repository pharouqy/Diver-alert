/**
 * src/components/ChatWindow.jsx
 *
 * Fenêtre de chat 1-to-1 avec un plongeur.
 * - Charge l'historique au montage via loadConversation (REST)
 * - Reçoit les messages temps réel via SocketContext
 * - Marque comme lu à l'ouverture
 * - Scroll auto vers le bas
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function ChatWindow({ peer, initialDraft = '', onClose }) {
  const { user } = useAuth();
  const {
    conversations,
    sendChatMessage,
    loadConversation,
    markConversationRead,
  } = useSocket();

  const myId = user?._id || user?.id;
  const peerId = peer?.userId;
  const messages = conversations[peerId] || [];

  const [text, setText] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Charger historique + marquer comme lu à l'ouverture
  useEffect(() => {
    if (!peerId) return;
    loadConversation(peerId);
    markConversationRead(peerId);
    inputRef.current?.focus();
  }, [peerId, loadConversation, markConversationRead]);

  useEffect(() => {
    setText(initialDraft || '');
  }, [peerId, initialDraft]);

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    sendChatMessage(peerId, trimmed);
    setText('');
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={S.window}>
      {/* En-tête */}
      <header style={S.header}>
        <div style={S.headerInfo}>
          <div style={S.avatar}>🤿</div>
          <div>
            <div style={S.peerName}>{peer?.name || 'Plongeur'}</div>
            <div style={S.peerStatus}>
              {peer?.role === 'rescuer' ? '🚨 Sauveteur' : '🤿 Plongeur'}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={S.btnClose} title="Fermer">✕</button>
      </header>

      {/* Messages */}
      <div style={S.messages}>
        {messages.length === 0 && (
          <div style={S.emptyState}>
            <span style={S.emptyIcon}>💬</span>
            <p>Début de la conversation</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = (msg.sender?._id || msg.sender) === myId;
          return (
            <div key={msg._id} style={{ ...S.msgRow, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...S.bubble, ...(isOwn ? S.bubbleOwn : S.bubbleOther) }}>
                <p style={{ ...S.msgContent, color: isOwn ? 'var(--color-ocean-deep)' : 'var(--color-text)' }}>
                  {msg.content}
                </p>
                <span style={{ ...S.msgTime, color: isOwn ? 'rgba(5, 12, 22, 0.55)' : 'var(--color-text-muted)' }}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Saisie */}
      <div style={S.inputBar}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message... (Entrée pour envoyer)"
          style={S.textarea}
          maxLength={2000}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            ...S.btnSend,
            opacity: !text.trim() || sending ? 0.4 : 1,
          }}
          title="Envoyer"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const S = {
  window: {
    position: 'fixed',
    bottom: '5rem',
    right: '1.5rem',
    width: '340px',
    maxHeight: '480px',
    background: 'var(--color-ocean-mid)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 3000,
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
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--color-ocean-light)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
  },
  peerName: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  peerStatus: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
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
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.875rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minHeight: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '0.5rem',
    color: 'var(--color-text-muted)',
    fontSize: '0.85rem',
    padding: '2rem',
  },
  emptyIcon: {
    fontSize: '2rem',
  },
  msgRow: {
    display: 'flex',
  },
  bubble: {
    maxWidth: '78%',
    padding: '0.5rem 0.75rem',
    borderRadius: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  bubbleOwn: {
    background: 'var(--color-accent)',
    borderBottomRightRadius: '0.25rem',
  },
  bubbleOther: {
    background: 'var(--color-ocean-light)',
    border: '1px solid var(--color-border)',
    borderBottomLeftRadius: '0.25rem',
  },
  msgContent: {
    fontSize: '0.875rem',
    color: 'var(--color-ocean-deep)',
    margin: 0,
    wordBreak: 'break-word',
    lineHeight: 1.4,
  },
  msgTime: {
    fontSize: '0.65rem',
    color: 'rgba(5, 12, 22, 0.55)',
    alignSelf: 'flex-end',
  },
  inputBar: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.625rem 0.75rem',
    borderTop: '1px solid var(--color-border)',
    background: 'var(--color-ocean-deep)',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    background: 'var(--color-ocean-mid)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    padding: '0.5rem 0.625rem',
    fontSize: '0.875rem',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.4,
    overflowY: 'auto',
    maxHeight: '80px',
  },
  btnSend: {
    background: 'var(--color-accent)',
    color: 'var(--color-ocean-deep)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    width: '36px',
    height: '36px',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },
};
