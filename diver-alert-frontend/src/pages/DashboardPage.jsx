import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket } from "../hooks/useSocket";
import { usePositionEmitter } from "../hooks/useSocket";
import MapView from "../components/MapView";
import AlertButton from "../components/AlertButton";
import AlertNotification from "../components/AlertNotification";
import ProductList from "../components/ProductList";
import MessagingPanel from "../components/MessagingPanel";
import ChatWindow from "../components/ChatWindow";
import ChatNotification from "../components/ChatNotification";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    position,
    error,
    isLoading: gpsLoading,
    hasGoodAccuracy,
    retry,
  } = useGeolocation();
  const {
    isConnected,
    divers,
    activeAlert,
    unreadCounts,
    incomingMessage,
    dismissIncomingMessage,
    fetchUnreadCounts,
  } = useSocket();

  const [alertRadius, setAlertRadius] = useState(5);
  const [activeTab, setActiveTab] = useState('map');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ── Messagerie ──────────────────────────────────────────────────────────────
  const [msgPanelOpen, setMsgPanelOpen] = useState(false);
  const [chatPeer, setChatPeer] = useState(null); // { userId, name, role }
  const [chatDraft, setChatDraft] = useState('');

  // Charger les compteurs non-lus au montage
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Badge global = somme de tous les non-lus
  const totalUnread = Object.values(unreadCounts).reduce((acc, n) => acc + n, 0);

  const openChat = (peer, draft = '') => {
    setChatPeer(peer);
    setChatDraft(draft);
    setMsgPanelOpen(false);
  };

  // Ouvrir le chat depuis la notification toast (on a senderId + senderName)
  const openChatFromNotif = (senderId, senderName) => {
    // Chercher le diver complet dans la liste, sinon construire un objet minimal
    const diver = divers.find((d) => d.userId === senderId);
    openChat(diver || { userId: senderId, name: senderName, role: 'diver' });
  };

  const openProductContactChat = (product) => {
    const owner = product?.owner;
    const ownerId = owner?._id || owner?.id || (typeof owner === 'string' ? owner : null);

    if (!ownerId) return;

    const sellerName = owner?.name || 'Vendeur';
    const productTitle = product?.title ? ` "${product.title}"` : '';
    const draft = `Bonjour, je suis interesse par votre annonce${productTitle}. Est-elle toujours disponible ?`;

    openChat(
      {
        userId: ownerId.toString(),
        name: sellerName,
        role: owner?.role || 'diver',
      },
      draft,
    );
    setMsgPanelOpen(false);
  };

  // Émettre la position GPS
  usePositionEmitter(position);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const otherDivers = divers.filter(
    (d) => d.userId !== (user?._id || user?.id),
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <header style={S.header}>
        <div style={S.identity}>
          <span style={S.name}>{user?.name}</span>
          <span style={S.roleTag}>
            {user?.role === "rescuer" ? "🚨 Sauveteur" : "🤿 Plongeur"}
          </span>
        </div>

        {/* Onglets navigation */}
        <div style={S.tabs}>
          <button
            style={activeTab === 'map' ? S.tabActive : S.tab}
            onClick={() => setActiveTab('map')}
          >
            🗺️ SOS & Carte
          </button>
          <button
            style={activeTab === 'marketplace' ? S.tabActive : S.tab}
            onClick={() => setActiveTab('marketplace')}
          >
            🛒 Marketplace
          </button>
        </div>

        <div style={S.statusGroup}>
          {/* Statut Socket */}
          <span
            style={{
              color: isConnected
                ? "var(--color-success)"
                : "var(--color-text-muted)",
              fontSize: "0.8rem",
            }}
          >
            {isConnected ? "🟢 En ligne" : "🔴 Hors ligne"}
          </span>

          {/* Statut GPS */}
          <span
            style={{
              fontSize: "0.8rem",
              color: gpsLoading
                ? "var(--color-warning)"
                : error
                  ? "var(--color-danger)"
                  : hasGoodAccuracy
                    ? "var(--color-success)"
                    : "var(--color-warning)",
            }}
          >
            {gpsLoading
              ? "⏳ GPS..."
              : error
                ? "❌ GPS"
                : `${hasGoodAccuracy ? "✅" : "⚠️"} ${position?.accuracy}m`}
          </span>
        </div>

        <button onClick={handleLogout} style={S.btnLogout}>
          ↩ Quitter
        </button>
      </header>

      {/* ── Bandeau GPS erreur ───────────────────────────────────────────── */}
      {error && (
        <div style={S.errorBar}>
          {error.message}
          {error.code !== 0 && (
            <button onClick={retry} style={S.retryBtn}>
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* ── Alerte SOS reçue ────────────────────────────────────────────── */}
      {activeAlert && (
        <div style={S.alertBanner}>
          🆘 ALERTE SOS de <strong>{activeAlert.emitter?.name}</strong> — Rayon{" "}
          {activeAlert.radius}km
        </div>
      )}

      {/* ── Corps principal ────────────────────────────────────────────────── */}
      {activeTab === 'map' ? (
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Carte */}
          <div style={{ flex: 1, position: "relative" }}>
            <MapView
              currentPosition={position}
              userId={user?._id || user?.id}
              divers={otherDivers}
              alertRadius={alertRadius}
              activeAlert={activeAlert}
            />

            {/* Overlay : compteur de plongeurs */}
            <div style={S.overlay}>
              <span>
                🤿 {otherDivers.length} plongeur{otherDivers.length !== 1 ? "s" : ""} en ligne
              </span>
              {!isConnected && (
                <span
                  style={{ color: "var(--color-warning)", fontSize: "0.75rem" }}
                >
                  Reconnexion...
                </span>
              )}
            </div>
          </div>

          {/* Bouton SOS */}
          <div
            style={{
              background: "var(--color-ocean-mid)",
              borderTop: "1px solid var(--color-border)",
              flexShrink: 0,
            }}
          >
            <AlertButton
              position={position}
              isConnected={isConnected}
              alertRadius={alertRadius}
              onRadiusChange={setAlertRadius}
            />
          </div>
        </div>
      ) : (
        <ProductList
          onCreateClick={() => {}}
          onContactSeller={openProductContactChat}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* ── Notification alerte SOS ──────────────────────────────────── */}
      <AlertNotification
        alert={activeAlert}
        myPosition={position}
        onDismiss={() => {}}
      />

      {/* ── Bouton flottant messagerie ───────────────────────────────────── */}
      <button
        style={S.fabChat}
        onClick={() => {
          setChatPeer(null);
          setMsgPanelOpen((prev) => !prev);
        }}
        title="Messagerie"
      >
        💬
        {totalUnread > 0 && (
          <span style={S.fabBadge}>{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
      </button>

      {/* ── Panel liste plongeurs ────────────────────────────────────────── */}
      {msgPanelOpen && !chatPeer && (
        <MessagingPanel
          onSelectPeer={openChat}
          onClose={() => setMsgPanelOpen(false)}
        />
      )}

      {/* ── Fenêtre de chat ──────────────────────────────────────────────── */}
      {chatPeer && (
        <ChatWindow
          peer={chatPeer}
          initialDraft={chatDraft}
          onClose={() => setChatPeer(null)}
        />
      )}

      {/* ── Toast notification message entrant ──────────────────────────── */}
      {incomingMessage && !chatPeer && (
        <ChatNotification
          notification={incomingMessage}
          onOpen={openChatFromNotif}
          onDismiss={dismissIncomingMessage}
        />
      )}
    </div>
  );
}

const S = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.625rem 1rem",
    background: "var(--color-ocean-mid)",
    borderBottom: "1px solid var(--color-border)",
    gap: "0.75rem",
    flexShrink: 0,
  },
  tabs: {
    display: "flex",
    background: "var(--color-ocean-deep)",
    padding: "0.25rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
  },
  tab: {
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    padding: "0.375rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  tabActive: {
    background: "var(--color-accent)",
    color: "var(--color-ocean-deep)",
    border: "none",
    padding: "0.375rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  identity: { display: "flex", alignItems: "center", gap: "0.5rem" },
  name: { fontWeight: 600 },
  roleTag: {
    fontSize: "0.75rem",
    background: "var(--color-ocean-light)",
    color: "var(--color-text-muted)",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
  },
  statusGroup: { display: "flex", gap: "1rem", alignItems: "center" },
  btnLogout: {
    background: "var(--color-ocean-light)",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.375rem 0.75rem",
    fontSize: "0.8rem",
  },
  errorBar: {
    background: "#3b1010",
    color: "var(--color-danger)",
    padding: "0.5rem 1rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    fontSize: "0.875rem",
    flexShrink: 0,
  },
  retryBtn: {
    background: "var(--color-danger)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  alertBanner: {
    background: "#3b0808",
    color: "var(--color-danger)",
    borderTop: "2px solid var(--color-danger)",
    padding: "0.75rem 1rem",
    textAlign: "center",
    fontSize: "1rem",
    flexShrink: 0,
  },
  overlay: {
    position: "absolute",
    top: "0.75rem",
    right: "0.75rem",
    zIndex: 1000,
    background: "rgba(13,33,55,0.9)",
    color: "var(--color-text)",
    padding: "0.375rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    border: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    alignItems: "flex-end",
  },
  // ── Bouton flottant messagerie ───────────────────────────────────────────
  fabChat: {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'var(--color-accent)',
    color: 'var(--color-ocean-deep)',
    border: 'none',
    fontSize: '1.4rem',
    boxShadow: '0 4px 20px rgba(0, 191, 255, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2800,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    position: 'fixed',
  },
  fabBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: 'var(--color-danger)',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '0.1rem 0.35rem',
    borderRadius: '999px',
    minWidth: '18px',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  sosBar: {
    background: "var(--color-ocean-mid)",
    borderTop: "1px solid var(--color-border)",
    padding: "0.875rem 1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.375rem",
    flexShrink: 0,
  },
  sosHint: { fontSize: "0.75rem", color: "var(--color-text-muted)" },
};
